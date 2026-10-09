-- Preview-only closed-pool outcomes and reversible customer decline.
-- This does not implement or replace the governed production draw.
begin;

-- Existing sample slots stand for the rest of the fictional preview crowd.
-- Record one seeded winner per closed offer without inventing a customer
-- account, reward, or production draw receipt.
create table demo_private.preview_closed_pool_demo_winners (
  offering_slug text primary key references demo_private.preview_entry_offerings(slug) on delete restrict,
  sample_entry_number integer not null check (sample_entry_number > 0),
  recorded_at timestamptz not null default now()
);
alter table demo_private.preview_closed_pool_demo_winners enable row level security;
revoke all on demo_private.preview_closed_pool_demo_winners from public, anon, authenticated, service_role;

create or replace function demo_private.resolve_closed_preview_offer(p_slug text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_offer demo_private.preview_entry_offerings; v_saved bigint; v_entry public.customer_entries;
begin
  if not coalesce((select preview_entries_enabled and environment = 'development-test'
      from demo_private.funding_config where singleton), false) then return; end if;
  select * into v_offer from demo_private.preview_entry_offerings where slug = p_slug for update;
  if not found or v_offer.repeatable_scenario or v_offer.forced_outcome <> 'active' then return; end if;
  select count(*) into v_saved from public.customer_entries e
    where e.offering_slug = p_slug and not exists (
      select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id
    );
  if v_offer.sample_entries::bigint + v_saved < v_offer.capacity then return; end if;
  if not exists (select 1 from public.entry_outcomes x join public.customer_entries e
      on e.id = x.customer_entry_id where e.offering_slug = p_slug and x.outcome = 'winner') then
    if v_offer.sample_entries < 1 then
      raise exception 'Preview offer requires a seeded winner slot' using errcode = 'P0001';
    end if;
    insert into demo_private.preview_closed_pool_demo_winners(offering_slug, sample_entry_number)
      values(p_slug, 1) on conflict(offering_slug) do nothing;
  end if;
  -- Customer-owned paid entries remain independent; each receives its own
  -- 30-day option. This is a scripted demo outcome, not a governed draw.
  for v_entry in select e.* from public.customer_entries e
    where e.offering_slug = p_slug and e.outcome_status = 'active'
      and not exists (select 1 from public.entry_outcomes x where x.customer_entry_id = e.id)
      and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id)
    order by e.created_at, e.id
  loop
    insert into public.entry_outcomes(customer_entry_id, customer_id, wallet_account_id, outcome)
      values(v_entry.id, v_entry.customer_id, v_entry.wallet_account_id, 'not_selected');
    insert into public.completion_options(customer_entry_id, customer_id, wallet_account_id, paid_cents, remaining_cents)
      values(v_entry.id, v_entry.customer_id, v_entry.wallet_account_id, v_entry.amount,
        greatest(v_offer.value_cents - v_entry.amount, 0));
  end loop;
end;
$$;
revoke all on function demo_private.resolve_closed_preview_offer(text) from public, anon, authenticated, service_role;

create function demo_private.resolve_preview_offer_after_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform demo_private.resolve_closed_preview_offer(new.offering_slug);
  return new;
end;
$$;
revoke all on function demo_private.resolve_preview_offer_after_entry() from public, anon, authenticated, service_role;
create trigger preview_offer_close_after_entry after insert on public.customer_entries
  for each row execute function demo_private.resolve_preview_offer_after_entry();

-- Reconcile already-full preview offers without changing any existing Entry,
-- Ledger entry, winner, reward, or saved customer action.
do $$ declare v_slug text; begin
  for v_slug in select slug from demo_private.preview_entry_offerings
    where active and not repeatable_scenario and forced_outcome = 'active'
  loop perform demo_private.resolve_closed_preview_offer(v_slug); end loop;
end $$;

-- A decline and revival are immutable events. Only a final settlement remains
-- unique; a customer may change their mind again before the original expiry.
alter table public.completion_option_events drop constraint if exists completion_option_events_event_type_check;
alter table public.completion_option_events add constraint completion_option_events_event_type_check
  check (event_type in ('declined','revived','purchased','cancelled','expired','reminders_opted_out','reminders_opted_in'));
drop index if exists public.completion_option_one_terminal_event;
create unique index completion_option_one_final_settlement
  on public.completion_option_events(completion_option_id)
  where event_type in ('purchased','cancelled','expired');

create or replace function demo_private.option_status(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = option.customer_entry_id) then 'cancelled'
    else coalesce((select case when event_type = 'revived'
        then case when option.expires_at <= now() then 'expired' else 'available' end
        else event_type end
      from public.completion_option_events where completion_option_id = p_id
        and event_type in ('declined','revived','purchased','cancelled','expired')
      order by created_at desc, id desc limit 1),
      case when option.expires_at <= now() then 'expired' else 'available' end) end
  from public.completion_options option where option.id = p_id;
$$;

create or replace function public.decline_purchase_option(p_completion_option_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_option public.completion_options; v_key text; v_revive uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid request' using errcode = '22023'; end if;
  select * into v_option from public.completion_options
    where id = p_completion_option_id and customer_id = v_uid
      and wallet_account_id = public.current_wallet_account_id() for update;
  if not found then raise exception 'Purchase option unavailable' using errcode = '42501'; end if;
  if exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = v_option.customer_entry_id) then
    raise exception 'Purchase option is no longer available' using errcode = 'P0001'; end if;
  if demo_private.option_status(v_option.id) = 'declined' then
    return jsonb_build_object('status','declined','duplicate',true,'entryRefunded',false); end if;
  if demo_private.option_status(v_option.id) <> 'available' then
    raise exception 'Purchase option is no longer available' using errcode = 'P0001'; end if;
  select id into v_revive from public.completion_option_events
    where completion_option_id = v_option.id and event_type = 'revived'
    order by created_at desc, id desc limit 1;
  v_key := case when v_revive is null then p_idempotency_key
    else 'decline_' || md5(p_idempotency_key || ':' || v_revive::text) end;
  if exists (select 1 from public.completion_option_events where customer_id = v_uid and idempotency_key = v_key) then
    raise exception 'Request key reused for another action' using errcode = '22023'; end if;
  insert into public.completion_option_events(completion_option_id,customer_id,wallet_account_id,event_type,idempotency_key,reason)
    values(v_option.id,v_uid,v_option.wallet_account_id,'declined',v_key,'Customer declined optional retailer gift card');
  update public.completion_option_reminders set status = 'cancelled', updated_at = now()
    where completion_option_id = v_option.id and status = 'pending';
  return jsonb_build_object('status','declined','duplicate',false,'entryRefunded',false);
end;
$$;
revoke all on function public.decline_purchase_option(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.decline_purchase_option(uuid,text) to authenticated;

create function public.revive_preview_purchase_option(p_completion_option_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_option public.completion_options; v_decline uuid; v_key text;
begin
  if v_uid is null or not coalesce((select preview_entries_enabled and environment = 'development-test'
      and preview_issuer = auth.jwt()->>'iss' from demo_private.funding_config where singleton), false) then
    raise exception 'Demo option revival unavailable' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid request' using errcode = '22023'; end if;
  select * into v_option from public.completion_options
    where id = p_completion_option_id and customer_id = v_uid
      and wallet_account_id = public.current_wallet_account_id() for update;
  if not found then raise exception 'Purchase option unavailable' using errcode = '42501'; end if;
  if exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = v_option.customer_entry_id) then
    raise exception 'Purchase option is no longer available' using errcode = 'P0001'; end if;
  if v_option.expires_at <= now() then
    raise exception 'The original 30-day option has expired' using errcode = 'P0001'; end if;
  if demo_private.option_status(v_option.id) = 'available' and exists (
    select 1 from public.completion_option_events where completion_option_id = v_option.id and event_type = 'revived') then
    return jsonb_build_object('status','available','duplicate',true); end if;
  if demo_private.option_status(v_option.id) <> 'declined' then
    raise exception 'Only a declined option can be revived' using errcode = 'P0001'; end if;
  select id into v_decline from public.completion_option_events
    where completion_option_id = v_option.id and event_type = 'declined'
    order by created_at desc, id desc limit 1;
  v_key := 'revive_' || md5(p_idempotency_key || ':' || v_decline::text);
  if exists (select 1 from public.completion_option_events where customer_id = v_uid and idempotency_key = v_key) then
    return jsonb_build_object('status','available','duplicate',true); end if;
  insert into public.completion_option_events(completion_option_id,customer_id,wallet_account_id,event_type,idempotency_key,reason)
    values(v_option.id,v_uid,v_option.wallet_account_id,'revived',v_key,'Customer revived declined demo option');
  if coalesce((select purchase_option_email_enabled from public.customer_communication_preferences where customer_id = v_uid), true) then
    update public.completion_option_reminders set status = 'pending', updated_at = now()
      where completion_option_id = v_option.id and status = 'cancelled' and scheduled_for > now();
  end if;
  return jsonb_build_object('status','available','duplicate',false,'expiresAt',v_option.expires_at,
    'remainingCents',v_option.remaining_cents);
end;
$$;
revoke all on function public.revive_preview_purchase_option(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.revive_preview_purchase_option(uuid,text) to authenticated;

-- A revived option can still be completed through the existing verified
-- payment writer. Its prior decline is historical, not a current block.
create or replace function public.record_retailer_gift_card_purchase(
  p_completion_option_id uuid, p_provider_event_id text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_option public.completion_options; v_reward public.customer_rewards; v_order public.customer_orders;
begin
  if p_provider_event_id is null or length(p_provider_event_id) < 8 or length(p_provider_event_id) > 200 then
    raise exception 'Invalid provider event' using errcode = '22023'; end if;
  select * into v_order from public.customer_orders where provider_event_id = p_provider_event_id;
  if found then
    if v_order.completion_option_id <> p_completion_option_id then
      raise exception 'Provider event reused for another option' using errcode = '22023'; end if;
    return jsonb_build_object('orderNumber',v_order.order_number,'duplicate',true);
  end if;
  select * into v_option from public.completion_options where id = p_completion_option_id for update;
  if not found or demo_private.option_status(p_completion_option_id) <> 'available' then
    raise exception 'Purchase option unavailable' using errcode = 'P0001'; end if;
  insert into public.customer_rewards(customer_entry_id, customer_id, wallet_account_id, wallet_scope, currency, source)
    values(v_option.customer_entry_id, v_option.customer_id, v_option.wallet_account_id,
      v_option.wallet_scope, v_option.currency, 'purchase') returning * into v_reward;
  insert into public.customer_orders(order_number, customer_id, wallet_account_id, completion_option_id,
    reward_id, provider_event_id, subtotal_cents, total_cents, currency)
    values('ord_' || replace(gen_random_uuid()::text, '-', ''), v_option.customer_id, v_option.wallet_account_id,
      v_option.id, v_reward.id, p_provider_event_id, v_option.remaining_cents, v_option.remaining_cents,
      v_option.currency) returning * into v_order;
  insert into public.completion_option_events(completion_option_id, customer_id, wallet_account_id,
    event_type, idempotency_key, metadata)
    values(v_option.id, v_option.customer_id, v_option.wallet_account_id, 'purchased',
      'purchase_' || replace(gen_random_uuid()::text, '-', ''),
      jsonb_build_object('orderNumber', v_order.order_number));
  insert into public.order_events(order_id, customer_id, event_type, provider_event_id)
    values(v_order.id, v_order.customer_id, 'payment_confirmed', p_provider_event_id || '_confirmed');
  update public.completion_option_reminders set status = 'cancelled', updated_at = now()
    where completion_option_id = v_option.id and status = 'pending';
  insert into demo_private.reward_alternate_events(alternate_id,reward_id,alternate_entry_id,event_type,reason)
    select id,reward_id,alternate_entry_id,'disqualified','Purchased retailer gift-card option'
    from demo_private.reward_alternates
    where alternate_entry_id = v_option.customer_entry_id and selected_at is null and disqualified_at is null
    on conflict (alternate_id,event_type) do nothing;
  update demo_private.reward_alternates set disqualified_at = now(),
    disqualification_reason = 'Purchased retailer gift-card option'
    where alternate_entry_id = v_option.customer_entry_id and selected_at is null and disqualified_at is null;
  return jsonb_build_object('orderNumber',v_order.order_number,'rewardId',v_reward.id,'duplicate',false);
end;
$$;
revoke all on function public.record_retailer_gift_card_purchase(uuid,text) from public, anon, authenticated, service_role;

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

-- Outcome email eligibility follows the current revived/declined state, while
-- still respecting the customer preference and entry-reset guard.
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
        or d.kind='paid_not_selected' and c.id is not null
          and demo_private.option_status(c.id) = 'available')
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
