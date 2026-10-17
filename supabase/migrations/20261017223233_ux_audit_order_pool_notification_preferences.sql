-- Keep the investor demo's displayed availability and fulfillment history in sync.
-- Historical customer entries, outcomes, rewards, ledger rows and payments are untouched.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- A recoverable, non-personal snapshot of Popular Rewards occupancy before calibration.
create table demo_private.popular_reward_ux_checkpoint (
  offering_slug text primary key,
  sample_entries integer not null,
  retained_customer_entries integer not null,
  capacity integer not null,
  captured_at timestamptz not null default now()
);
alter table demo_private.popular_reward_ux_checkpoint enable row level security;
revoke all on demo_private.popular_reward_ux_checkpoint from public, anon, authenticated, service_role;

do $$
declare v_count integer;
begin
  if not coalesce((select environment = 'development-test' and preview_entries_enabled
    from demo_private.funding_config where singleton), false) then
    raise exception 'Demo calibration is unavailable outside development-test' using errcode = '42501';
  end if;
  if exists (select 1 from public.entry_requests r
    join demo_private.preview_popular_reward_scenarios s on s.offering_slug = r.offering_slug
    where r.status = 'validating') then
    raise exception 'A Popular Rewards entry is pending' using errcode = 'P0001';
  end if;

  insert into demo_private.popular_reward_ux_checkpoint
    (offering_slug, sample_entries, retained_customer_entries, capacity)
  select o.slug, o.sample_entries,
    (select count(*)::integer from public.customer_entries e
      where e.offering_slug = o.slug and not exists (
        select 1 from public.demo_entry_reset_items r where r.customer_entry_id = e.id)),
    o.capacity
  from demo_private.preview_entry_offerings o
  join demo_private.preview_popular_reward_scenarios s on s.offering_slug = o.slug;
  get diagnostics v_count = row_count;
  if v_count <> 40 or exists (
    select 1 from demo_private.popular_reward_ux_checkpoint c
    where c.capacity - c.retained_customer_entries - 1 < 1
       or c.capacity - c.retained_customer_entries - 1 >= c.capacity
  ) then raise exception 'Popular Rewards cannot be safely calibrated' using errcode = 'P0001'; end if;

  insert into demo_private.preview_pool_reset_events
    (offering_slug, requested_by, reset_source, prior_sample_entries, new_sample_entries, retained_customer_entries)
  select c.offering_slug, null, 'manual', c.sample_entries,
    c.capacity - c.retained_customer_entries - 1, c.retained_customer_entries
  from demo_private.popular_reward_ux_checkpoint c
  where c.sample_entries <> c.capacity - c.retained_customer_entries - 1;

  update demo_private.preview_entry_offerings o
    set sample_entries = c.capacity - c.retained_customer_entries - 1, updated_at = now()
  from demo_private.popular_reward_ux_checkpoint c
  where o.slug = c.offering_slug
    and o.sample_entries <> c.capacity - c.retained_customer_entries - 1;
end;
$$;

-- Older preview checkouts issued a usable reward but stopped at payment_confirmed.
-- Fulfillment history is append-only, so add the missing event for eligible demo orders.
insert into public.order_events(order_id, customer_id, event_type, provider_event_id,
  metadata)
select o.id, o.customer_id, 'fulfilled', 'demo_ready_backfill_' || o.id::text,
  jsonb_build_object('source', 'ready_reward_reconciliation')
from public.customer_orders o
join public.customer_rewards r on r.id = o.reward_id
where o.provider_event_id like 'preview_%'
  and demo_private.reward_status(r.id) = 'ready'
  and not exists (select 1 from public.demo_entry_reset_items reset
    where reset.customer_entry_id = r.customer_entry_id)
  and (select e.event_type from public.order_events e where e.order_id = o.id
    order by e.created_at desc, e.id desc limit 1) in ('payment_confirmed', 'issuance_pending')
on conflict(provider_event_id) do nothing;

-- Customer-controlled in-app update categories. Critical account/security notices
-- remain available regardless of these optional feed settings.
alter table public.customer_communication_preferences
  add column in_app_alerts jsonb not null default '{}'::jsonb
  check (jsonb_typeof(in_app_alerts) = 'object');

create function public.get_in_app_alert_preferences() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select in_app_alerts from public.customer_communication_preferences
    where customer_id = auth.uid()), '{}'::jsonb);
$$;
revoke all on function public.get_in_app_alert_preferences() from public, anon, authenticated, service_role;
grant execute on function public.get_in_app_alert_preferences() to authenticated;

create function public.set_in_app_alert_preference(p_key text, p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_key not in ('purchase_options', 'reward_ready', 'reward_deadline',
    'order_updates', 'wallet_updates', 'crew_updates', 'support_replies', 'pool_progress')
    or p_enabled is null then
    raise exception 'Invalid notification preference' using errcode = '22023';
  end if;
  insert into public.customer_communication_preferences(customer_id, in_app_alerts, updated_at)
    values (v_uid, jsonb_build_object(p_key, p_enabled), now())
  on conflict(customer_id) do update
    set in_app_alerts = public.customer_communication_preferences.in_app_alerts
      || jsonb_build_object(p_key, p_enabled), updated_at = now()
  returning in_app_alerts into v_result;
  return v_result;
end;
$$;
revoke all on function public.set_in_app_alert_preference(text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.set_in_app_alert_preference(text, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
