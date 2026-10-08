-- Account-scoped preview replay. The original entries, outcomes, orders and
-- ledger remain immutable; reset markers remove only current demo actions.
begin;

create table public.demo_entry_reset_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  request_key text not null check (request_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  entry_count integer not null check (entry_count >= 0),
  created_at timestamptz not null default now(),
  unique (customer_id, request_key)
);
create table public.demo_entry_reset_items (
  customer_entry_id uuid primary key references public.customer_entries(id) on delete restrict,
  reset_event_id uuid not null references public.demo_entry_reset_events(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index demo_entry_reset_items_owner_idx on public.demo_entry_reset_items(customer_id, wallet_account_id);
alter table public.demo_entry_reset_events enable row level security;
alter table public.demo_entry_reset_items enable row level security;
revoke all on public.demo_entry_reset_events, public.demo_entry_reset_items from public, anon, authenticated, service_role;
grant select on public.demo_entry_reset_events, public.demo_entry_reset_items to authenticated;
create policy "Owner can read demo entry reset events" on public.demo_entry_reset_events
  for select to authenticated using (customer_id = (select auth.uid()) and wallet_account_id = (select public.current_wallet_account_id()));
create policy "Owner can read demo entry reset items" on public.demo_entry_reset_items
  for select to authenticated using (customer_id = (select auth.uid()) and wallet_account_id = (select public.current_wallet_account_id()));
create trigger demo_entry_reset_events_immutable before update or delete on public.demo_entry_reset_events
  for each row execute function public.reject_financial_history_mutation();
create trigger demo_entry_reset_items_immutable before update or delete on public.demo_entry_reset_items
  for each row execute function public.reject_financial_history_mutation();
create trigger demo_entry_reset_events_no_truncate before truncate on public.demo_entry_reset_events
  for each statement execute function public.reject_financial_history_mutation();
create trigger demo_entry_reset_items_no_truncate before truncate on public.demo_entry_reset_items
  for each statement execute function public.reject_financial_history_mutation();

create function public.get_demo_entry_reset_preview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid; v_count integer; v_pending boolean;
begin
  perform demo_private.assert_card_environment();
  if not coalesce((select preview_entries_enabled from demo_private.funding_config where singleton), false) then
    raise exception 'Demo entry reset is unavailable' using errcode = '42501';
  end if;
  v_wallet := public.current_wallet_account_id();
  if v_wallet is null then raise exception 'Demo wallet is unavailable' using errcode = '42501'; end if;
  select count(*) into v_count from public.customer_entries e
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet
      and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id);
  select exists (select 1 from public.entry_requests r
    where r.customer_id = auth.uid() and r.wallet_account_id = v_wallet and r.status = 'validating') into v_pending;
  return jsonb_build_object('entryCount', v_count, 'pending', v_pending);
end;
$$;
revoke all on function public.get_demo_entry_reset_preview() from public, anon, authenticated, service_role;
grant execute on function public.get_demo_entry_reset_preview() to authenticated;

create function public.clear_own_demo_entries(p_expected_count integer, p_request_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid; v_count integer; v_event public.demo_entry_reset_events;
begin
  if p_expected_count is null or p_expected_count < 1 or p_request_key is null
    or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid demo entry reset request' using errcode = '22023';
  end if;
  perform demo_private.assert_card_environment();
  if not coalesce((select preview_entries_enabled from demo_private.funding_config where singleton), false) then
    raise exception 'Demo entry reset is unavailable' using errcode = '42501';
  end if;
  -- Same customer -> payment account -> wallet lock order as entry acceptance.
  v_wallet := demo_private.lock_funding_wallet();
  select * into v_event from public.demo_entry_reset_events
    where customer_id = auth.uid() and request_key = p_request_key;
  if found then
    if v_event.wallet_account_id <> v_wallet or v_event.entry_count <> p_expected_count then
      raise exception 'Reset request key was reused' using errcode = '22023';
    end if;
    return jsonb_build_object('clearedCount', v_event.entry_count, 'alreadyApplied', true);
  end if;
  if exists (select 1 from public.entry_requests r
    where r.customer_id = auth.uid() and r.wallet_account_id = v_wallet and r.status = 'validating') then
    raise exception 'Wait for your pending entry countdown to finish, then try again.' using errcode = 'P0001';
  end if;
  select count(*) into v_count from public.customer_entries e
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet
      and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id);
  if v_count <> p_expected_count then
    raise exception 'Your entries changed. Review them again before clearing.' using errcode = 'P0001';
  end if;
  -- No real or redeemable credential may be hidden by a demo replay action.
  if exists (select 1 from public.customer_entries e
    join public.customer_rewards reward on reward.customer_entry_id = e.id
    join demo_private.reward_credentials credential on credential.reward_id = reward.id
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet and credential.redeemable) then
    raise exception 'A redeemable reward cannot be cleared as demo data.' using errcode = '42501';
  end if;
  insert into public.demo_entry_reset_events(customer_id, wallet_account_id, request_key, entry_count)
    values (auth.uid(), v_wallet, p_request_key, v_count) returning * into v_event;
  insert into public.demo_entry_reset_items(customer_entry_id, reset_event_id, customer_id, wallet_account_id)
    select e.id, v_event.id, e.customer_id, e.wallet_account_id from public.customer_entries e
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet
      and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id);
  -- Prevent future automated demo messages about entries removed from the walkthrough.
  update public.completion_option_reminders reminder set status = 'cancelled', updated_at = now()
    from public.completion_options option where reminder.completion_option_id = option.id
      and option.customer_id = auth.uid() and option.wallet_account_id = v_wallet
      and reminder.status = 'pending'
      and exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = option.customer_entry_id);
  update public.reward_claim_reminders reminder set status = 'cancelled', updated_at = now()
    from public.customer_rewards reward where reminder.reward_id = reward.id
      and reward.customer_id = auth.uid() and reward.wallet_account_id = v_wallet
      and reminder.status = 'pending'
      and exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = reward.customer_entry_id);
  update public.entry_outcome_email_deliveries delivery set status = 'cancelled', updated_at = now()
    from public.entry_outcomes outcome where delivery.entry_outcome_id = outcome.id
      and outcome.customer_id = auth.uid() and outcome.wallet_account_id = v_wallet
      and delivery.status = 'pending'
      and exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = outcome.customer_entry_id);
  return jsonb_build_object('clearedCount', v_count, 'alreadyApplied', false);
end;
$$;
revoke all on function public.clear_own_demo_entries(integer,text) from public, anon, authenticated, service_role;
grant execute on function public.clear_own_demo_entries(integer,text) to authenticated;

-- Direct reads (including Crew's own entry list) now show only current demo entries.
drop policy "Customers can view own current entries" on public.customer_entries;
create policy "Customers can view own current entries" on public.customer_entries
  for select to authenticated using (
    customer_id = (select auth.uid())
    and wallet_account_id = (select public.current_wallet_account_id())
    and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = id)
  );

create or replace function demo_private.option_status(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = option.customer_entry_id)
    then 'cancelled' else coalesce((select event_type from public.completion_option_events
      where completion_option_id = p_id and event_type in ('declined','purchased','cancelled','expired')
      order by created_at desc, id desc limit 1),
      case when option.expires_at <= now() then 'expired' else 'available' end) end
  from public.completion_options option where option.id = p_id;
$$;
create or replace function demo_private.reward_status(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = r.customer_entry_id)
    then 'cancelled' else coalesce((select event_type from public.reward_events
      where reward_id = p_id and event_type in ('redeemed','expired','cancelled') order by created_at desc,id desc limit 1),
      case when r.source = 'winner' and demo_private.reward_deadline(r.id) <= now()
          and not exists (select 1 from public.reward_events where reward_id = r.id and event_type = 'claimed') then 'expired'
      else coalesce((select case event_type when 'issuance_ready' then 'ready' else event_type end
        from public.reward_events where reward_id = r.id and event_type in ('issuance_pending','issuance_failed','issuance_ready')
        order by created_at desc,id desc limit 1), 'ready') end) end
  from public.customer_rewards r where r.id = p_id;
$$;

create or replace function public.crew_can_view_shared_entry(p_owner_id uuid, p_entry_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_viewer uuid := auth.uid();
  v_settings public.crew_visibility_settings%rowtype;
  v_rule jsonb;
  v_group jsonb;
begin
  if v_viewer is null or p_owner_id is null or p_entry_id is null then return false; end if;
  if exists (select 1 from public.demo_entry_reset_items reset
    where reset.customer_entry_id = p_entry_id and reset.customer_id = p_owner_id) then return false; end if;
  if v_viewer = p_owner_id then return true; end if;
  if not exists (
    select 1 from public.crew_invitations c where c.status = 'accepted'
      and ((c.requester_id = p_owner_id and c.recipient_id = v_viewer)
        or (c.recipient_id = p_owner_id and c.requester_id = v_viewer))
  ) then return false; end if;
  select * into v_settings from public.crew_visibility_settings where owner_id = p_owner_id;
  v_rule := coalesce(v_settings.entry_rules -> p_entry_id::text, v_settings.default_rule,
    '{"audience":"everyone"}'::jsonb);
  if v_rule->>'audience' = 'everyone' then return true; end if;
  if v_rule->>'audience' = 'people' then
    return coalesce(v_rule->'memberIds', '[]'::jsonb) ? v_viewer::text;
  end if;
  if v_rule->>'audience' = 'groups' then
    for v_group in select value from jsonb_array_elements(coalesce(v_settings.groups, '[]'::jsonb)) loop
      if coalesce(v_rule->'groupIds', '[]'::jsonb) ? (v_group->>'id')
        and coalesce(v_group->'memberIds', '[]'::jsonb) ? v_viewer::text then
        return true;
      end if;
    end loop;
  end if;
  return false;
end;
$$;

-- A reset entry cannot be declined through an old link or RPC call.
create or replace function public.decline_purchase_option(p_completion_option_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_option public.completion_options; v_existing public.completion_option_events;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  select * into v_option from public.completion_options
    where id = p_completion_option_id and customer_id = v_uid
      and wallet_account_id = public.current_wallet_account_id() for update;
  if not found then raise exception 'Purchase option unavailable' using errcode = '42501'; end if;
  if exists (select 1 from public.demo_entry_reset_items reset
    where reset.customer_entry_id = v_option.customer_entry_id) then
    raise exception 'Purchase option is no longer available' using errcode = 'P0001';
  end if;
  select * into v_existing from public.completion_option_events
    where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.completion_option_id <> p_completion_option_id or v_existing.event_type <> 'declined' then
      raise exception 'Request key reused for another action' using errcode = '22023';
    end if;
    return jsonb_build_object('status', v_existing.event_type, 'duplicate', true);
  end if;
  if demo_private.option_status(v_option.id) <> 'available' then
    raise exception 'Purchase option is no longer available' using errcode = 'P0001';
  end if;
  insert into public.completion_option_events(
    completion_option_id, customer_id, wallet_account_id, event_type, idempotency_key, reason
  ) values (v_option.id, v_uid, v_option.wallet_account_id, 'declined', p_idempotency_key,
    'Customer declined optional retailer gift card');
  update public.completion_option_reminders set status = 'cancelled', updated_at = now()
    where completion_option_id = v_option.id and status = 'pending';
  return jsonb_build_object('status', 'declined', 'duplicate', false, 'entryRefunded', false);
end;
$$;

-- Existing historical orders remain in Orders & Fulfillment. Only current
-- activity and its action controls are removed by this replay operation.
create or replace function public.get_account_activity()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc, a.entry_id desc), '[]'::jsonb)
  into v_rows from (
    select e.entry_id, e.offering_slug as slug, o.title, o.retailer, o.image_path as image,
      case
        when r.source = 'winner' and coalesce(rs.reward_status, 'ready') in ('ready','issuance_pending','issuance_failed') then 'prize'
        when coalesce(x.outcome, e.outcome_status) = 'not_selected'
          and c.id is not null and cs.option_status = 'available' then 'completion'
        when coalesce(x.outcome, e.outcome_status) in ('winner','not_selected') then 'completed'
        else 'active'
      end as status,
      'digital'::text as reward_kind,
      o.value_cents as price_cents, e.amount as paid_cents,
      case when coalesce(x.outcome, e.outcome_status) = 'not_selected'
        then coalesce(c.remaining_cents, greatest(o.value_cents - e.amount, 0)) else 0 end as remaining_cents,
      case
        when r.source = 'winner' and rs.reward_status = 'expired' then 'Reward claim period expired'
        when r.source = 'winner' and rs.claimed_at is not null then 'Retailer gift card claimed'
        when r.source = 'winner' then 'Retailer gift card ready to claim'
        when r.source = 'purchase' then 'Purchased retailer gift card ready'
        when coalesce(x.outcome, e.outcome_status) = 'not_selected'
          and cs.option_status = 'available' then 'Optional retailer gift card available'
        when coalesce(x.outcome, e.outcome_status) = 'not_selected' then initcap(cs.option_status)
        else 'Entry recorded'
      end as availability,
      c.id as completion_option_id, cs.option_status as completion_option_status,
      c.expires_at as completion_expires_at, r.id as reward_id, rs.reward_status,
      demo_private.reward_deadline(r.id) as reward_claim_expires_at,
      rs.claimed_at as reward_claimed_at, e.created_at
    from public.customer_entries e
    join demo_private.preview_entry_offerings o on o.slug = e.offering_slug
    left join public.entry_outcomes x on x.customer_entry_id = e.id
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
      and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id)
      and not exists (select 1 from public.demo_reward_restarts restart
        where restart.reward_id = r.id and restart.customer_id = e.customer_id
          and restart.wallet_account_id = e.wallet_account_id)
  ) a;
  return v_rows;
end;
$$;
revoke all on function public.get_account_activity() from public, anon, authenticated, service_role;
grant execute on function public.get_account_activity() to authenticated;

create or replace function public.get_account_orders()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.order_number desc), '[]'::jsonb)
  into v_rows from (
    select o.order_number, e.offering_slug as reward_slug, r.id as reward_id, p.title, p.retailer,
      p.image_path as image, r.face_value_cents, o.total_cents as amount_paid_cents,
      coalesce((select oe.event_type from public.order_events oe
        where oe.order_id = o.id order by oe.created_at desc, oe.id desc limit 1), 'payment_confirmed') as status,
      o.created_at
    from public.customer_orders o
    join public.customer_rewards r on r.id = o.reward_id
    join public.customer_entries e on e.id = r.customer_entry_id
    join demo_private.preview_entry_offerings p on p.slug = e.offering_slug
    where o.customer_id = auth.uid() and o.wallet_account_id = v_wallet
      and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id)
  ) x;
  return v_rows;
end;
$$;
revoke all on function public.get_account_orders() from public, anon, authenticated, service_role;
grant execute on function public.get_account_orders() to authenticated;

-- A worker that already picked up a queued message must recheck reset state
-- before sending; completed/sent messages remain historical records.
create or replace function public.get_outcome_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'customerId',d.customer_id,
    'kind',d.kind,
    'entryId',e.entry_id,
    'slug',e.offering_slug,
    'title',f.title,
    'retailer',f.retailer,
    'valueCents',f.value_cents,
    'paidCents',e.amount,
    'completionCents',c.remaining_cents,
    'completionDeadline',c.expires_at,
    'rewardId',r.id,
    'eligible',
      coalesce(p.entry_outcome_email_enabled,true)
      and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id)
      and x.outcome=case when d.kind='winner' then 'winner' else 'not_selected' end
      and (d.kind='winner' and r.id is not null
        or d.kind='paid_not_selected' and c.id is not null and c.expires_at>now()
          and not exists(select 1 from public.completion_option_events ev
            where ev.completion_option_id=c.id and ev.event_type in ('declined','purchased','cancelled','expired')))
  )
  from public.entry_outcome_email_deliveries d
  join public.entry_outcomes x on x.id=d.entry_outcome_id
  join public.customer_entries e on e.id=x.customer_entry_id and e.customer_id=d.customer_id
  join demo_private.preview_entry_offerings f on f.slug=e.offering_slug
  join demo_private.preview_offer_closures closure on closure.offering_slug=e.offering_slug
  left join public.customer_communication_preferences p on p.customer_id=d.customer_id
  left join public.completion_options c on c.customer_entry_id=e.id
  left join public.customer_rewards r on r.customer_entry_id=e.id
  where d.id=p_id and d.status='processing';
$$;

notify pgrst, 'reload schema';
commit;
