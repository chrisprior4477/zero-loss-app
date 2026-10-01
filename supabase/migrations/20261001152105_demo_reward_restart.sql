-- A preview-only presentation reset for the three repeatable showcase outcomes.
-- Historical entries, rewards, orders, and ledger rows remain immutable.
begin;

create table public.demo_reward_restarts (
  reward_id uuid primary key references public.customer_rewards(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  created_at timestamptz not null default now(),
  unique (customer_id, idempotency_key)
);
create index demo_reward_restarts_owner_idx on public.demo_reward_restarts(customer_id, wallet_account_id);
alter table public.demo_reward_restarts enable row level security;
revoke all on public.demo_reward_restarts from public, anon, authenticated, service_role;
grant select on public.demo_reward_restarts to authenticated;
create policy "Customers can view own demo reward restarts" on public.demo_reward_restarts
for select to authenticated using (
  customer_id = (select auth.uid())
  and wallet_account_id = (select public.current_wallet_account_id())
);
create trigger demo_reward_restarts_immutable before update or delete on public.demo_reward_restarts
  for each row execute function public.reject_financial_history_mutation();
create trigger demo_reward_restarts_no_truncate before truncate on public.demo_reward_restarts
  for each statement execute function public.reject_financial_history_mutation();

create function public.restart_preview_reward(p_reward_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_wallet uuid := public.current_wallet_account_id();
  v_slug text;
  v_existing public.demo_reward_restarts;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_reward_id is null or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid demo restart request' using errcode = '22023';
  end if;
  if not coalesce((select environment = 'development-test' and preview_entries_enabled
      and preview_issuer = auth.jwt()->>'iss' from demo_private.funding_config where singleton), false) then
    raise exception 'Demo restarts are unavailable in this environment' using errcode = '42501';
  end if;

  select e.offering_slug into v_slug
  from public.customer_rewards r
  join public.customer_entries e on e.id = r.customer_entry_id
  join demo_private.preview_entry_offerings o on o.slug = e.offering_slug
  join demo_private.reward_credentials credential on credential.reward_id = r.id
  where r.id = p_reward_id and r.customer_id = v_uid and r.wallet_account_id = v_wallet
    and e.customer_id = v_uid and e.wallet_account_id = v_wallet
    and r.source in ('winner', 'purchase') and o.repeatable_scenario
    and credential.provider = 'preview' and not credential.redeemable
    and demo_private.reward_status(r.id) = 'ready';
  if v_slug is null then raise exception 'This sample reward cannot be restarted' using errcode = 'P0001'; end if;

  select * into v_existing from public.demo_reward_restarts
    where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found and v_existing.reward_id <> p_reward_id then
    raise exception 'Request key reused for another reward' using errcode = '22023';
  end if;
  insert into public.demo_reward_restarts(reward_id, customer_id, wallet_account_id, idempotency_key)
  values (p_reward_id, v_uid, v_wallet, p_idempotency_key)
  on conflict (reward_id) do nothing;
  return jsonb_build_object('status', 'restarted', 'slug', v_slug);
end;
$$;
revoke all on function public.restart_preview_reward(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.restart_preview_reward(uuid,text) to authenticated;

create or replace function public.get_account_activity()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc, a.entry_id desc), '[]'::jsonb)
  into v_rows from (
    select e.entry_id, e.offering_slug as slug, o.title, o.retailer, o.image_path as image,
      case
        when r.source = 'winner' and coalesce(rs.reward_status, 'ready') in ('ready','issuance_pending','issuance_failed') then 'prize'
        when e.outcome_status = 'not_selected' and coalesce(cs.option_status, 'available') = 'available' then 'completion'
        when e.outcome_status in ('winner','not_selected') then 'completed'
        else 'active'
      end as status,
      'digital'::text as reward_kind,
      o.value_cents as price_cents, e.amount as paid_cents,
      case when e.outcome_status = 'not_selected' then greatest(o.value_cents - e.amount, 0) else 0 end as remaining_cents,
      case
        when r.source = 'winner' and rs.reward_status = 'expired' then 'Reward claim period expired'
        when r.source = 'winner' and rs.claimed_at is not null then 'Retailer gift card claimed'
        when r.source = 'winner' then 'Retailer gift card ready to claim'
        when r.source = 'purchase' then 'Purchased retailer gift card ready'
        when e.outcome_status = 'not_selected' and cs.option_status = 'available' then 'Optional retailer gift card available'
        when e.outcome_status = 'not_selected' then initcap(cs.option_status)
        else 'Entry recorded'
      end as availability,
      c.id as completion_option_id, cs.option_status as completion_option_status,
      c.expires_at as completion_expires_at, r.id as reward_id, rs.reward_status,
      demo_private.reward_deadline(r.id) as reward_claim_expires_at,
      rs.claimed_at as reward_claimed_at, e.created_at
    from public.customer_entries e
    join demo_private.preview_entry_offerings o on o.slug = e.offering_slug
    left join public.completion_options c on c.customer_entry_id = e.id
    left join lateral (
      select coalesce(
        (select ce.event_type from public.completion_option_events ce
          where ce.completion_option_id = c.id and ce.event_type in ('declined','purchased','cancelled','expired')
          order by ce.created_at desc limit 1),
        case when c.expires_at <= now() then 'expired' else 'available' end
      ) as option_status
    ) cs on c.id is not null
    left join public.customer_rewards r on r.customer_entry_id = e.id
    left join lateral (
      select demo_private.reward_status(r.id) as reward_status,
        (select re.created_at from public.reward_events re where re.reward_id = r.id and re.event_type = 'claimed'
          order by re.created_at desc limit 1) as claimed_at
    ) rs on r.id is not null
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet
      and not exists (select 1 from public.demo_reward_restarts restart
        where restart.reward_id = r.id and restart.customer_id = e.customer_id
          and restart.wallet_account_id = e.wallet_account_id)
  ) a;
  return v_rows;
end;
$$;
revoke all on function public.get_account_activity() from public, anon, authenticated, service_role;
grant execute on function public.get_account_activity() to authenticated;
notify pgrst, 'reload schema';
commit;
