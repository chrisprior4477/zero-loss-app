-- Connect confirmed, repeatable showcase outcomes to the existing
-- notification outbox. Ordinary offers still require a capacity closure.
begin;

create or replace function demo_private.queue_outcome_email(p_outcome_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_outcome public.entry_outcomes; v_entry public.customer_entries;
begin
  select * into v_outcome from public.entry_outcomes where id = p_outcome_id;
  if not found or v_outcome.outcome not in ('winner', 'not_selected') then return; end if;
  select * into v_entry from public.customer_entries where id = v_outcome.customer_entry_id;
  if not found or exists (select 1 from public.demo_entry_reset_items r
      where r.customer_entry_id = v_entry.id) then return; end if;
  if not exists (select 1 from demo_private.preview_offer_closures c
      where c.offering_slug = v_entry.offering_slug)
    and not exists (
      select 1 from demo_private.preview_entry_offerings o
      where o.slug = v_entry.offering_slug and o.repeatable_scenario
        and o.forced_outcome = v_outcome.outcome) then return; end if;
  if not coalesce((select entry_outcome_email_enabled
      from public.customer_communication_preferences p
      where p.customer_id = v_outcome.customer_id), true) then return; end if;
  insert into public.entry_outcome_email_deliveries(entry_outcome_id, customer_id, kind)
  values(v_outcome.id, v_outcome.customer_id,
    case when v_outcome.outcome = 'winner' then 'winner' else 'paid_not_selected' end)
  on conflict(entry_outcome_id) do nothing;
end;
$$;
revoke all on function demo_private.queue_outcome_email(uuid) from public, anon, authenticated, service_role;

create or replace function public.get_outcome_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'customerId', d.customer_id,
    'kind', d.kind,
    'entryId', e.entry_id,
    'slug', e.offering_slug,
    'title', f.title,
    'retailer', f.retailer,
    'valueCents', f.value_cents,
    'paidCents', e.amount,
    'completionCents', c.remaining_cents,
    'completionDeadline', c.expires_at,
    'rewardId', r.id,
    'eligible',
      coalesce(p.entry_outcome_email_enabled, true)
      and not exists (select 1 from public.demo_entry_reset_items reset
        where reset.customer_entry_id = e.id)
      and (closure.offering_slug is not null or
        (f.repeatable_scenario and f.forced_outcome = x.outcome))
      and x.outcome = case when d.kind = 'winner' then 'winner' else 'not_selected' end
      and (d.kind = 'winner' and r.id is not null
          and not exists (select 1 from public.demo_reward_restarts restart
            where restart.reward_id = r.id)
        or d.kind = 'paid_not_selected' and c.id is not null
          and demo_private.option_status(c.id) = 'available')
  )
  from public.entry_outcome_email_deliveries d
  join public.entry_outcomes x on x.id = d.entry_outcome_id
  join public.customer_entries e on e.id = x.customer_entry_id and e.customer_id = d.customer_id
  join demo_private.preview_entry_offerings f on f.slug = e.offering_slug
  left join demo_private.preview_offer_closures closure on closure.offering_slug = e.offering_slug
  left join public.customer_communication_preferences p on p.customer_id = d.customer_id
  left join public.completion_options c on c.customer_entry_id = e.id
  left join public.customer_rewards r on r.customer_entry_id = e.id
  where d.id = p_id and d.status = 'processing';
$$;
revoke all on function public.get_outcome_email_payload(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_outcome_email_payload(uuid) to service_role;

-- The existing ready-email worker already resolves the recipient from Auth.
-- Queue immediate winners as well as purchases; a later issuance-ready event
-- may revive a row cancelled while issuance was pending.
create or replace function demo_private.queue_purchase_reward_ready_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.source in ('purchase', 'winner') then
    insert into public.reward_ready_email_deliveries(reward_id, customer_id)
    values(new.id, new.customer_id) on conflict(reward_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function demo_private.queue_purchase_reward_ready_email() from public, anon, authenticated, service_role;

create or replace function demo_private.queue_delayed_winner_reward_ready_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_reward public.customer_rewards;
begin
  if new.event_type <> 'issuance_ready' or not exists (
    select 1 from public.reward_events e where e.reward_id = new.reward_id
      and e.event_type in ('issuance_pending', 'issuance_failed')
      and e.created_at < new.created_at
  ) then return new; end if;
  select * into v_reward from public.customer_rewards
    where id = new.reward_id and source = 'winner';
  if found then
    insert into public.reward_ready_email_deliveries(reward_id, customer_id)
    values(v_reward.id, v_reward.customer_id)
    on conflict(reward_id) do update
      set status = 'pending', scheduled_for = now() + interval '1 minute',
        last_error = null, updated_at = now()
      where reward_ready_email_deliveries.status = 'cancelled';
  end if;
  return new;
end;
$$;
revoke all on function demo_private.queue_delayed_winner_reward_ready_email() from public, anon, authenticated, service_role;

create or replace function public.get_reward_ready_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'customerId', d.customer_id, 'rewardId', r.id, 'slug', e.offering_slug,
    'title', o.title, 'retailer', r.retailer, 'valueCents', r.face_value_cents,
    'eligible', d.status = 'processing' and demo_private.reward_status(r.id) = 'ready'
      and not exists (select 1 from public.demo_entry_reset_items reset
        where reset.customer_entry_id = e.id)
      and not exists (select 1 from public.demo_reward_restarts restart
        where restart.reward_id = r.id)
      -- A quick claim must not suppress the one-time ready notice: the
      -- message links to the current reward status, not to an unclaimed-only action.
      and not exists (select 1 from public.reward_events ev
        where ev.reward_id = r.id and ev.event_type in ('redeemed', 'expired', 'cancelled'))
  )
  from public.reward_ready_email_deliveries d
  join public.customer_rewards r on r.id = d.reward_id and r.customer_id = d.customer_id
  join public.customer_entries e on e.id = r.customer_entry_id and e.customer_id = r.customer_id
  join demo_private.preview_entry_offerings o on o.slug = e.offering_slug
  where d.id = p_id and d.status = 'processing';
$$;
revoke all on function public.get_reward_ready_email_payload(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_reward_ready_email_payload(uuid) to service_role;

notify pgrst, 'reload schema';
commit;
