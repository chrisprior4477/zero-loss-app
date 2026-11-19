-- Direct demo checkout shares the existing wallet ledger, gift-card issuer
-- and order history. A direct purchase never creates a sweepstakes entry.
begin;

alter table demo_private.preview_entry_offerings
  add column direct_checkout boolean not null default false,
  add constraint direct_demo_card_value check (
    not direct_checkout or (value_cents = 10000 and slug ~ '-100-gift-card(-ending-soon)?$')
  );

update demo_private.preview_entry_offerings
  set direct_checkout = true
  where value_cents = 10000 and slug ~ '-100-gift-card(-ending-soon)?$'
    and exists (select 1 from demo_private.funding_config where singleton and environment = 'development-test');

alter table public.customer_rewards
  alter column customer_entry_id drop not null,
  add column direct_offering_slug text references demo_private.preview_entry_offerings(slug) on delete restrict,
  add constraint reward_entry_or_direct_purchase check (
    (customer_entry_id is not null and direct_offering_slug is null)
    or (customer_entry_id is null and direct_offering_slug is not null and source = 'purchase')
  ),
  add foreign key (wallet_account_id, customer_id, wallet_scope, currency)
    references public.wallet_accounts(id, customer_id, scope, currency) on delete restrict;

create index customer_rewards_direct_owner on public.customer_rewards(customer_id, wallet_account_id)
  where direct_offering_slug is not null;

-- Preserve previously reserved entries. The new restriction applies only when
-- starting an entry request for a listing now sold directly.
create function demo_private.guard_direct_checkout_entry_request()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from demo_private.preview_entry_offerings
    where slug = new.offering_slug and direct_checkout) then
    raise exception 'This demo gift card is available through direct checkout.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function demo_private.guard_direct_checkout_entry_request() from public, anon, authenticated, service_role;
create trigger no_entry_request_for_direct_checkout before insert on public.entry_requests
  for each row execute function demo_private.guard_direct_checkout_entry_request();

create or replace function demo_private.initialize_customer_reward()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_value integer; v_retailer text;
begin
  if new.direct_offering_slug is not null then
    select o.value_cents, o.retailer into v_value, v_retailer
      from demo_private.preview_entry_offerings o where o.slug = new.direct_offering_slug and o.direct_checkout;
  else
    select o.value_cents, o.retailer into v_value, v_retailer
      from public.customer_entries e
      join demo_private.preview_entry_offerings o on o.slug = e.offering_slug
      where e.id = new.customer_entry_id;
  end if;
  if not found then raise exception 'Reward offering is unavailable' using errcode = '55000'; end if;
  new.face_value_cents := v_value;
  new.retailer := v_retailer;
  new.claim_timezone := demo_private.safe_customer_timezone(new.customer_id);
  new.claim_expires_at := demo_private.calendar_deadline(new.created_at, new.claim_timezone, 90);
  return new;
end;
$$;

-- Purchase-ready email reminders are for cards that still need to be opened.
-- Direct demo checkout claims its reward within the same transaction.
create or replace function demo_private.queue_purchase_reward_ready_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.source = 'purchase' and new.direct_offering_slug is null then
    insert into public.reward_ready_email_deliveries(reward_id, customer_id)
      values (new.id, new.customer_id) on conflict (reward_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function demo_private.queue_purchase_reward_ready_email() from public, anon, authenticated, service_role;

create function public.purchase_direct_demo_gift_card(p_slug text, p_request_id uuid, p_expected_cents integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_wallet uuid;
  v_event text;
  v_price integer;
  v_balance bigint;
  v_order public.customer_orders;
  v_reward public.customer_rewards;
begin
  if v_uid is null or not coalesce((select environment = 'development-test' and enabled and preview_entries_enabled
      and preview_issuer = auth.jwt()->>'iss' from demo_private.funding_config where singleton), false) then
    raise exception 'Demo checkout unavailable' using errcode = '42501';
  end if;
  if p_slug is null or p_request_id is null or p_expected_cents is null or p_expected_cents <= 0 then
    raise exception 'Invalid checkout request' using errcode = '22023';
  end if;
  v_wallet := demo_private.lock_funding_wallet();
  v_event := 'direct_demo_card_' || v_uid::text || '_' || p_request_id::text;

  select * into v_order from public.customer_orders where provider_event_id = v_event;
  if found then
    if v_order.customer_id <> v_uid or v_order.wallet_account_id <> v_wallet
      or v_order.total_cents <> p_expected_cents or not exists (
        select 1 from public.customer_rewards where id = v_order.reward_id and direct_offering_slug = p_slug
      ) then raise exception 'Checkout request key was reused' using errcode = '22023'; end if;
    return jsonb_build_object('status', 'purchased', 'rewardId', v_order.reward_id, 'orderNumber', v_order.order_number);
  end if;

  select value_cents into v_price from demo_private.preview_entry_offerings
    where slug = p_slug and direct_checkout for share;
  if not found or v_price <> p_expected_cents then
    raise exception 'Demo gift card or price changed' using errcode = '22023';
  end if;
  select coalesce(sum(amount) filter (where balance_type = 'PLAYABLE'), 0) into v_balance
    from public.ledger_entries where wallet_account_id = v_wallet;
  if v_balance < v_price then raise exception 'Add demo funds before buying this gift card.' using errcode = 'P0001'; end if;

  insert into public.customer_rewards(customer_id, wallet_account_id, wallet_scope, currency, source, direct_offering_slug)
    values (v_uid, v_wallet, 'demo', 'USD', 'purchase', p_slug) returning * into v_reward;
  insert into public.customer_orders(order_number, customer_id, wallet_account_id, reward_id, provider_event_id, subtotal_cents, total_cents, currency)
    values ('ord_' || replace(gen_random_uuid()::text, '-', ''), v_uid, v_wallet, v_reward.id, v_event, v_price, v_price, 'USD') returning * into v_order;
  insert into public.ledger_entries(ledger_entry_id, customer_id, wallet_account_id, wallet_scope, entry_type, balance_type, amount, source_event, currency)
    values ('len_' || replace(gen_random_uuid()::text, '-', ''), v_uid, v_wallet, 'demo', 'PURCHASE_DEBIT', 'PLAYABLE', -v_price, v_event, 'USD');
  insert into public.reward_events(reward_id, customer_id, event_type, idempotency_key)
    values (v_reward.id, v_uid, 'claimed', 'direct_claim_' || replace(v_reward.id::text, '-', ''));
  insert into public.order_events(order_id, customer_id, event_type, provider_event_id)
    values (v_order.id, v_uid, 'payment_confirmed', v_event || '_confirmed'),
           (v_order.id, v_uid, 'fulfilled', v_event || '_issued');
  update public.reward_claim_reminders set status = 'cancelled', updated_at = now()
    where reward_id = v_reward.id and status = 'pending';
  return jsonb_build_object('status', 'purchased', 'rewardId', v_reward.id, 'orderNumber', v_order.order_number);
end;
$$;
revoke all on function public.purchase_direct_demo_gift_card(text, uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.purchase_direct_demo_gift_card(text, uuid, integer) to authenticated;


create or replace function public.get_preview_offering_availability() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', a.slug, 'capacity', a.capacity, 'sold', a.sold,
    'remaining', greatest(0, a.capacity - a.sold),
    'entryPriceCents', a.entry_price_cents,
    'repeatableScenario', a.repeatable_scenario, 'directPriceCents', a.direct_price_cents
  ) order by a.slug), '[]'::jsonb)
  from (
    select o.slug, o.capacity, o.entry_price_cents, o.repeatable_scenario, case when o.direct_checkout then o.value_cents end as direct_price_cents,
      least(o.capacity, o.sample_entries::bigint + case when o.repeatable_scenario then 0 else
        (select count(*) from public.customer_entries e
          where e.offering_slug = o.slug
            and not exists (select 1 from public.demo_entry_reset_items reset
              where reset.customer_entry_id = e.id)) +
        (select coalesce(sum(r.requested_quantity), 0) from public.entry_requests r
          where r.offering_slug = o.slug and r.status = 'validating') end) as sold
    from demo_private.preview_entry_offerings o
    where (o.active or o.direct_checkout) and exists (select 1 from demo_private.funding_config
      where singleton and environment = 'development-test' and preview_entries_enabled
        and preview_issuer = 'https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1')
  ) a;
$$;

create or replace function public.get_account_orders()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.order_number desc), '[]'::jsonb)
  into v_rows from (
    select o.order_number, p.slug as reward_slug, r.id as reward_id, p.title, p.retailer,
      p.image_path as image, r.face_value_cents, o.total_cents as amount_paid_cents,
      coalesce((select oe.event_type from public.order_events oe
        where oe.order_id = o.id
        order by oe.created_at desc,
          case oe.event_type
            when 'corrected' then 6
            when 'cancelled' then 5
            when 'exception' then 4
            when 'fulfilled' then 3
            when 'issuance_pending' then 2
            when 'payment_confirmed' then 1
            else 0
          end desc, oe.id desc limit 1), 'payment_confirmed') as status,
      o.created_at
    from public.customer_orders o
    join public.customer_rewards r on r.id = o.reward_id
    left join public.customer_entries e on e.id = r.customer_entry_id
    join demo_private.preview_entry_offerings p on p.slug = coalesce(r.direct_offering_slug, e.offering_slug)
    where o.customer_id = auth.uid() and o.wallet_account_id = v_wallet
      and not exists (select 1 from public.demo_entry_reset_items reset where reset.customer_entry_id = e.id)
  ) x;
  return v_rows;
end;
$$;

revoke all on function public.get_account_orders() from public, anon, authenticated, service_role;
grant execute on function public.get_account_orders() to authenticated;

create or replace function public.get_account_activity()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc, a.entry_id desc, a.reward_id desc), '[]'::jsonb)
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
    union all
    select null::text as entry_id, o.slug, o.title, o.retailer, o.image_path,
      'completed', 'digital', r.face_value_cents, ord.total_cents, 0,
      'Purchased retailer gift card ready', null::uuid, null::text,
      null::timestamptz, r.id, r.source, demo_private.reward_status(r.id),
      demo_private.reward_deadline(r.id),
      (select re.created_at from public.reward_events re where re.reward_id = r.id and re.event_type = 'claimed'),
      r.created_at
    from public.customer_rewards r
    join demo_private.preview_entry_offerings o on o.slug = r.direct_offering_slug
    join public.customer_orders ord on ord.reward_id = r.id
    where r.customer_id = auth.uid() and r.wallet_account_id = v_wallet
  ) a;
  return v_rows;
end;
$$;

revoke all on function public.get_account_activity() from public, anon, authenticated, service_role;
grant execute on function public.get_account_activity() to authenticated;


notify pgrst, 'reload schema';
commit;
