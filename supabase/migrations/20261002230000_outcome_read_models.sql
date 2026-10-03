-- Final outcomes are append-only. An entry's creation-time outcome_status is
-- never rewritten when a later pool draw determines its result. Read models
-- must prefer the recorded outcome so a draw is visible in My Activity and in
-- retry-safe receipts without mutating entry or ledger history.
begin;

create or replace function demo_private.preview_entry_response(p_entry_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entryId', e.entry_id,
    'offeringSlug', e.offering_slug,
    'status', coalesce(x.outcome, e.outcome_status),
    'amountCents', e.amount,
    'duplicate', false
  )
  from public.customer_entries e
  left join public.entry_outcomes x on x.customer_entry_id = e.id
  where e.id = p_entry_id;
$$;
revoke all on function demo_private.preview_entry_response(uuid)
  from public, anon, authenticated, service_role;

create or replace function demo_private.preview_entry_batch_response(p_batch_id uuid, p_duplicate boolean default false)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'batchId', b.batch_id,
    'offeringSlug', b.offering_slug,
    'quantity', b.quantity,
    'status', case
      when bool_or(coalesce(x.outcome, e.outcome_status) = 'winner') then 'winner'
      when bool_and(coalesce(x.outcome, e.outcome_status) = 'not_selected') then 'not_selected'
      else 'active'
    end,
    'amountCents', coalesce(sum(e.amount), 0),
    'duplicate', p_duplicate,
    'entryId', (array_agg(e.entry_id order by e.created_at,e.id))[1],
    'rewardId', (array_agg(r.id order by e.created_at,e.id) filter(where r.id is not null))[1]
  )
  from public.preview_entry_batches b
  join public.customer_entries e on e.preview_batch_id = b.id
  left join public.entry_outcomes x on x.customer_entry_id = e.id
  left join public.customer_rewards r on r.customer_entry_id = e.id
  where b.id = p_batch_id
  group by b.id, b.batch_id, b.offering_slug, b.quantity;
$$;
revoke all on function demo_private.preview_entry_batch_response(uuid,boolean)
  from public, anon, authenticated, service_role;

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
      and not exists (select 1 from public.demo_reward_restarts restart
        where restart.reward_id = r.id and restart.customer_id = e.customer_id
          and restart.wallet_account_id = e.wallet_account_id)
  ) a;
  return v_rows;
end;
$$;
revoke all on function public.get_account_activity() from public, anon, authenticated, service_role;
grant execute on function public.get_account_activity() to authenticated;

create or replace function public.get_preview_entry_reconciliation()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into v_rows from (
    select e.entry_id, e.offering_slug, e.created_at,
      case
        when l.id is null or l.amount <> -e.amount then 'discrepancy'
        when e.outcome_status = 'active' and x.id is null and c.id is null and w.id is null then 'reconciled'
        when x.outcome = 'winner' and w.id is not null and c.id is null then 'reconciled'
        when x.outcome = 'not_selected' and c.id is not null and w.id is null then 'reconciled'
        else 'discrepancy'
      end as reconciliation
    from public.customer_entries e
    left join public.ledger_entries l on l.customer_entry_id = e.id
    left join public.entry_outcomes x on x.customer_entry_id = e.id
    left join public.completion_options c on c.customer_entry_id = e.id
    left join public.customer_rewards w on w.customer_entry_id = e.id
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet
  ) r;
  return v_rows;
end;
$$;
revoke all on function public.get_preview_entry_reconciliation() from public, anon, authenticated, service_role;
grant execute on function public.get_preview_entry_reconciliation() to authenticated;

notify pgrst, 'reload schema';
commit;
