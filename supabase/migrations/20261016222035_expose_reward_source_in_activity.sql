-- The persisted reward source distinguishes a purchased option from a win.
-- Expose that source in the existing account-scoped activity read model;
-- keep all entries, outcomes, rewards, and ledger records unchanged.
begin;

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
      c.expires_at as completion_expires_at, r.id as reward_id,
      r.source as reward_source, rs.reward_status,
      demo_private.reward_deadline(r.id) as reward_claim_expires_at,
      rs.claimed_at as reward_claimed_at, e.created_at
    from public.customer_entries e
    join demo_private.preview_entry_offerings o on o.slug = e.offering_slug
    left join public.entry_outcomes x on x.customer_entry_id = e.id
    left join public.completion_options c on c.customer_entry_id = e.id
    left join lateral (select demo_private.option_status(c.id) as option_status) cs on c.id is not null
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

notify pgrst, 'reload schema';
commit;
