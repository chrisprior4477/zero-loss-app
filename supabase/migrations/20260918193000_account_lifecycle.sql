-- Account lifecycle: optional purchase windows, retailer gift-card rewards,
-- reminder outboxes, auditable alternate winners, and provider-confirmed orders.
-- Preview records use the same ownership/state model as production; only the
-- payment, email and reward-provider adapters differ by environment.
begin;

create function demo_private.safe_customer_timezone(p_customer_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists (
      select 1 from pg_catalog.pg_timezone_names z
      where z.name = coalesce((select p.timezone from public.customer_profiles p where p.customer_id = p_customer_id), 'America/New_York')
    ) then coalesce((select p.timezone from public.customer_profiles p where p.customer_id = p_customer_id), 'America/New_York')
    else 'America/New_York'
  end;
$$;
revoke all on function demo_private.safe_customer_timezone(uuid) from public, anon, authenticated, service_role;

-- The issuance day is day zero. The deadline is the start of the local day
-- after the final full calendar day, represented as an exclusive timestamp.
create function demo_private.calendar_deadline(
  p_issued_at timestamptz,
  p_timezone text,
  p_full_days integer
) returns timestamptz language sql stable set search_path = '' as $$
  select (
    pg_catalog.date_trunc('day', p_issued_at at time zone p_timezone)
    + pg_catalog.make_interval(days => p_full_days + 1)
  ) at time zone p_timezone;
$$;
revoke all on function demo_private.calendar_deadline(timestamptz,text,integer) from public, anon, authenticated, service_role;

alter table public.completion_options
  add column expires_at timestamptz,
  add column expiration_timezone text;

alter table public.completion_options disable trigger completion_options_immutable;
update public.completion_options c set
  expiration_timezone = demo_private.safe_customer_timezone(c.customer_id),
  expires_at = demo_private.calendar_deadline(
    c.created_at,
    demo_private.safe_customer_timezone(c.customer_id),
    30
  );
alter table public.completion_options enable trigger completion_options_immutable;

alter table public.completion_options
  alter column expires_at set not null,
  alter column expiration_timezone set not null,
  add constraint completion_options_expiry_after_creation check (expires_at > created_at);

create function demo_private.initialize_completion_option()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.expiration_timezone := demo_private.safe_customer_timezone(new.customer_id);
  new.expires_at := demo_private.calendar_deadline(new.created_at, new.expiration_timezone, 30);
  return new;
end;
$$;
revoke all on function demo_private.initialize_completion_option() from public, anon, authenticated, service_role;
create trigger completion_option_initialize before insert on public.completion_options
  for each row execute function demo_private.initialize_completion_option();

create table public.completion_option_events (
  id uuid primary key default gen_random_uuid(),
  completion_option_id uuid not null references public.completion_options(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  event_type text not null check (event_type in (
    'declined','purchased','cancelled','expired','reminders_opted_out','reminders_opted_in'
  )),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  reason text check (reason is null or length(reason) <= 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (customer_id, idempotency_key)
);
create unique index completion_option_one_terminal_event
  on public.completion_option_events(completion_option_id)
  where event_type in ('declined','purchased','cancelled','expired');
create index completion_option_events_history
  on public.completion_option_events(completion_option_id, created_at desc);

create table public.completion_option_reminders (
  id uuid primary key default gen_random_uuid(),
  completion_option_id uuid not null references public.completion_options(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  reminder_key text not null check (reminder_key in ('available','21d','14d','7d','3d','24h','6h','1h')),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','cancelled','failed')),
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text check (last_error is null or length(last_error) <= 1000),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (completion_option_id, reminder_key),
  check ((status = 'sent') = (sent_at is not null))
);
create index completion_option_reminders_due
  on public.completion_option_reminders(scheduled_for, id) where status = 'pending';

create table public.customer_communication_preferences (
  customer_id uuid primary key references public.customers(id) on delete restrict,
  purchase_option_email_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create function demo_private.schedule_completion_option_reminders()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.completion_option_reminders(
    completion_option_id, customer_id, reminder_key, scheduled_for
  ) values
    (new.id, new.customer_id, 'available', new.created_at),
    (new.id, new.customer_id, '21d', new.expires_at - interval '21 days'),
    (new.id, new.customer_id, '14d', new.expires_at - interval '14 days'),
    (new.id, new.customer_id, '7d', new.expires_at - interval '7 days'),
    (new.id, new.customer_id, '3d', new.expires_at - interval '3 days'),
    (new.id, new.customer_id, '24h', new.expires_at - interval '24 hours'),
    (new.id, new.customer_id, '6h', new.expires_at - interval '6 hours'),
    (new.id, new.customer_id, '1h', new.expires_at - interval '1 hour')
  on conflict (completion_option_id, reminder_key) do nothing;
  return new;
end;
$$;
revoke all on function demo_private.schedule_completion_option_reminders() from public, anon, authenticated, service_role;
create trigger completion_option_schedule_reminders after insert on public.completion_options
  for each row execute function demo_private.schedule_completion_option_reminders();

insert into public.completion_option_reminders(completion_option_id, customer_id, reminder_key, scheduled_for)
select c.id, c.customer_id, r.reminder_key, r.scheduled_for
from public.completion_options c
cross join lateral (values
  ('available'::text, c.created_at),
  ('21d', c.expires_at - interval '21 days'),
  ('14d', c.expires_at - interval '14 days'),
  ('7d', c.expires_at - interval '7 days'),
  ('3d', c.expires_at - interval '3 days'),
  ('24h', c.expires_at - interval '24 hours'),
  ('6h', c.expires_at - interval '6 hours'),
  ('1h', c.expires_at - interval '1 hour')
) r(reminder_key, scheduled_for)
on conflict (completion_option_id, reminder_key) do nothing;

alter table public.customer_rewards
  add column source text not null default 'winner' check (source in ('winner','purchase')),
  add column face_value_cents integer,
  add column retailer text,
  add column claim_expires_at timestamptz,
  add column claim_timezone text;

alter table public.customer_rewards disable trigger customer_rewards_immutable;
update public.customer_rewards r set
  face_value_cents = o.value_cents,
  retailer = o.retailer,
  claim_timezone = demo_private.safe_customer_timezone(r.customer_id),
  claim_expires_at = demo_private.calendar_deadline(
    r.created_at,
    demo_private.safe_customer_timezone(r.customer_id),
    90
  )
from public.customer_entries e
join demo_private.preview_entry_offerings o on o.slug = e.offering_slug
where e.id = r.customer_entry_id;
alter table public.customer_rewards enable trigger customer_rewards_immutable;

alter table public.customer_rewards
  alter column face_value_cents set not null,
  alter column retailer set not null,
  alter column claim_expires_at set not null,
  alter column claim_timezone set not null,
  add constraint customer_rewards_value_positive check (face_value_cents > 0),
  add constraint customer_rewards_retailer_present check (length(trim(retailer)) between 1 and 160),
  add constraint customer_rewards_claim_after_creation check (claim_expires_at > created_at);

create function demo_private.initialize_customer_reward()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_value integer; v_retailer text;
begin
  select o.value_cents, o.retailer into v_value, v_retailer
  from public.customer_entries e
  join demo_private.preview_entry_offerings o on o.slug = e.offering_slug
  where e.id = new.customer_entry_id;
  if not found then raise exception 'Reward offering is unavailable' using errcode = '55000'; end if;
  new.face_value_cents := v_value;
  new.retailer := v_retailer;
  new.claim_timezone := demo_private.safe_customer_timezone(new.customer_id);
  new.claim_expires_at := demo_private.calendar_deadline(new.created_at, new.claim_timezone, 90);
  return new;
end;
$$;
revoke all on function demo_private.initialize_customer_reward() from public, anon, authenticated, service_role;
create trigger customer_reward_initialize before insert on public.customer_rewards
  for each row execute function demo_private.initialize_customer_reward();

create table public.reward_events (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.customer_rewards(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  event_type text not null check (event_type in (
    'claimed','claim_extended','redeemed','expired','cancelled','issuance_pending','issuance_failed','issuance_ready'
  )),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  reason text check (reason is null or length(reason) <= 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (customer_id, idempotency_key)
);
create unique index reward_one_claim on public.reward_events(reward_id) where event_type = 'claimed';
create unique index reward_one_terminal on public.reward_events(reward_id)
  where event_type in ('redeemed','expired','cancelled');
create index reward_events_history on public.reward_events(reward_id, created_at desc);

create table public.reward_claim_reminders (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.customer_rewards(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  reminder_key text not null check (reminder_key in ('available','60d','30d','14d','7d','3d','1d')),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','cancelled','failed')),
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text check (last_error is null or length(last_error) <= 1000),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reward_id, reminder_key),
  check ((status = 'sent') = (sent_at is not null))
);

create table demo_private.reward_credentials (
  reward_id uuid primary key references public.customer_rewards(id) on delete restrict,
  provider text not null default 'preview',
  provider_reference text not null unique,
  credential text not null check (credential ~ '^[0-9]{12}$'),
  redeemable boolean not null default false,
  created_at timestamptz not null default now()
);
alter table demo_private.reward_credentials enable row level security;
revoke all on demo_private.reward_credentials from public, anon, authenticated, service_role;

create function demo_private.initialize_reward_delivery()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into demo_private.reward_credentials(reward_id, provider_reference, credential)
  values (
    new.id,
    'preview_' || replace(gen_random_uuid()::text, '-', ''),
    lpad((floor(random() * 1000000000000))::bigint::text, 12, '0')
  );
  insert into public.reward_claim_reminders(reward_id, customer_id, reminder_key, scheduled_for)
  values
    (new.id, new.customer_id, 'available', new.created_at),
    (new.id, new.customer_id, '60d', new.claim_expires_at - interval '60 days'),
    (new.id, new.customer_id, '30d', new.claim_expires_at - interval '30 days'),
    (new.id, new.customer_id, '14d', new.claim_expires_at - interval '14 days'),
    (new.id, new.customer_id, '7d', new.claim_expires_at - interval '7 days'),
    (new.id, new.customer_id, '3d', new.claim_expires_at - interval '3 days'),
    (new.id, new.customer_id, '1d', new.claim_expires_at - interval '1 day')
  on conflict (reward_id, reminder_key) do nothing;
  return new;
end;
$$;
revoke all on function demo_private.initialize_reward_delivery() from public, anon, authenticated, service_role;
create trigger customer_reward_initialize_delivery after insert on public.customer_rewards
  for each row execute function demo_private.initialize_reward_delivery();

insert into demo_private.reward_credentials(reward_id, provider_reference, credential)
select r.id, 'preview_' || replace(gen_random_uuid()::text, '-', ''),
  lpad((floor(random() * 1000000000000))::bigint::text, 12, '0')
from public.customer_rewards r
on conflict (reward_id) do nothing;

insert into public.reward_claim_reminders(reward_id, customer_id, reminder_key, scheduled_for)
select r.id, r.customer_id, x.reminder_key, x.scheduled_for
from public.customer_rewards r
cross join lateral (values
  ('available'::text, r.created_at),
  ('60d', r.claim_expires_at - interval '60 days'),
  ('30d', r.claim_expires_at - interval '30 days'),
  ('14d', r.claim_expires_at - interval '14 days'),
  ('7d', r.claim_expires_at - interval '7 days'),
  ('3d', r.claim_expires_at - interval '3 days'),
  ('1d', r.claim_expires_at - interval '1 day')
) x(reminder_key, scheduled_for)
on conflict (reward_id, reminder_key) do nothing;

-- Alternate order is private operational data. A purchased gift-card option
-- disqualifies that entry without rewriting the original drawing record.
create table demo_private.reward_alternates (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.customer_rewards(id) on delete restrict,
  alternate_entry_id uuid not null references public.customer_entries(id) on delete restrict,
  position integer not null check (position > 0),
  selected_at timestamptz,
  disqualified_at timestamptz,
  disqualification_reason text,
  created_at timestamptz not null default now(),
  unique (reward_id, position),
  unique (reward_id, alternate_entry_id),
  check (not (selected_at is not null and disqualified_at is not null))
);
alter table demo_private.reward_alternates enable row level security;
revoke all on demo_private.reward_alternates from public, anon, authenticated, service_role;

create table demo_private.reward_alternate_events (
  id uuid primary key default gen_random_uuid(),
  alternate_id uuid not null references demo_private.reward_alternates(id) on delete restrict,
  reward_id uuid not null references public.customer_rewards(id) on delete restrict,
  alternate_entry_id uuid not null references public.customer_entries(id) on delete restrict,
  event_type text not null check (event_type in ('selected','disqualified')),
  reason text not null check (length(trim(reason)) between 3 and 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (alternate_id, event_type)
);
alter table demo_private.reward_alternate_events enable row level security;
revoke all on demo_private.reward_alternate_events from public, anon, authenticated, service_role;
create trigger reward_alternate_events_immutable before update or delete on demo_private.reward_alternate_events
  for each row execute function public.reject_financial_history_mutation();
create trigger reward_alternate_events_no_truncate before truncate on demo_private.reward_alternate_events
  for each statement execute function public.reject_financial_history_mutation();

create table public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique check (order_number ~ '^ord_[0-9a-f]+$'),
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  completion_option_id uuid unique references public.completion_options(id) on delete restrict,
  reward_id uuid not null unique references public.customer_rewards(id) on delete restrict,
  provider_event_id text not null unique,
  order_kind text not null default 'retailer_gift_card' check (order_kind = 'retailer_gift_card'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  total_cents integer not null check (total_cents = subtotal_cents),
  currency text not null default 'USD' check (currency = 'USD'),
  created_at timestamptz not null default now()
);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  event_type text not null check (event_type in ('payment_confirmed','issuance_pending','fulfilled','exception','cancelled','corrected')),
  provider_event_id text unique,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index order_events_history on public.order_events(order_id, created_at desc);

alter table public.completion_option_events enable row level security;
alter table public.completion_option_reminders enable row level security;
alter table public.customer_communication_preferences enable row level security;
alter table public.reward_events enable row level security;
alter table public.reward_claim_reminders enable row level security;
alter table public.customer_orders enable row level security;
alter table public.order_events enable row level security;

revoke all on public.completion_option_events, public.completion_option_reminders,
  public.customer_communication_preferences, public.reward_events,
  public.reward_claim_reminders, public.customer_orders, public.order_events
  from public, anon, authenticated, service_role;
grant select on public.completion_option_events, public.completion_option_reminders,
  public.customer_communication_preferences, public.reward_events,
  public.reward_claim_reminders, public.customer_orders, public.order_events
  to authenticated;

create policy "Customers can view own completion events" on public.completion_option_events
for select to authenticated using (
  customer_id = (select auth.uid()) and wallet_account_id = (select public.current_wallet_account_id())
);
create policy "Customers can view own completion reminders" on public.completion_option_reminders
for select to authenticated using (customer_id = (select auth.uid()));
create policy "Customers can view own communication preferences" on public.customer_communication_preferences
for select to authenticated using (customer_id = (select auth.uid()));
create policy "Customers can view own reward events" on public.reward_events
for select to authenticated using (customer_id = (select auth.uid()));
create policy "Customers can view own reward reminders" on public.reward_claim_reminders
for select to authenticated using (customer_id = (select auth.uid()));
create policy "Customers can view own orders" on public.customer_orders
for select to authenticated using (
  customer_id = (select auth.uid()) and wallet_account_id = (select public.current_wallet_account_id())
);
create policy "Customers can view own order events" on public.order_events
for select to authenticated using (customer_id = (select auth.uid()));

create trigger completion_option_events_immutable before update or delete on public.completion_option_events
  for each row execute function public.reject_financial_history_mutation();
create trigger completion_option_events_no_truncate before truncate on public.completion_option_events
  for each statement execute function public.reject_financial_history_mutation();
create trigger reward_events_immutable before update or delete on public.reward_events
  for each row execute function public.reject_financial_history_mutation();
create trigger reward_events_no_truncate before truncate on public.reward_events
  for each statement execute function public.reject_financial_history_mutation();
create trigger customer_orders_immutable before update or delete on public.customer_orders
  for each row execute function public.reject_financial_history_mutation();
create trigger customer_orders_no_truncate before truncate on public.customer_orders
  for each statement execute function public.reject_financial_history_mutation();
create trigger order_events_immutable before update or delete on public.order_events
  for each row execute function public.reject_financial_history_mutation();
create trigger order_events_no_truncate before truncate on public.order_events
  for each statement execute function public.reject_financial_history_mutation();

create function public.decline_purchase_option(p_completion_option_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_option public.completion_options; v_existing public.completion_option_events;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  select * into v_existing from public.completion_option_events
    where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.completion_option_id <> p_completion_option_id or v_existing.event_type <> 'declined' then raise exception 'Request key reused for another action' using errcode='22023'; end if;
    return jsonb_build_object('status', v_existing.event_type, 'duplicate', true);
  end if;
  select * into v_option from public.completion_options
    where id = p_completion_option_id and customer_id = v_uid
      and wallet_account_id = public.current_wallet_account_id() for update;
  if not found then raise exception 'Purchase option unavailable' using errcode = '42501'; end if;
  if v_option.expires_at <= now() then raise exception 'Purchase option has expired' using errcode = 'P0001'; end if;
  if exists (select 1 from public.completion_option_events where completion_option_id = v_option.id and event_type in ('declined','purchased','cancelled','expired')) then
    raise exception 'Purchase option is no longer available' using errcode = 'P0001';
  end if;
  insert into public.completion_option_events(
    completion_option_id, customer_id, wallet_account_id, event_type, idempotency_key, reason
  ) values (v_option.id, v_uid, v_option.wallet_account_id, 'declined', p_idempotency_key, 'Customer declined optional retailer gift card');
  update public.completion_option_reminders set status = 'cancelled', updated_at = now()
    where completion_option_id = v_option.id and status = 'pending';
  return jsonb_build_object('status', 'declined', 'duplicate', false, 'entryRefunded', false);
end;
$$;
revoke all on function public.decline_purchase_option(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.decline_purchase_option(uuid,text) to authenticated;

create function public.set_purchase_option_email_enabled(p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.customer_communication_preferences(customer_id, purchase_option_email_enabled, updated_at)
  values (v_uid, p_enabled, now())
  on conflict (customer_id) do update set purchase_option_email_enabled = excluded.purchase_option_email_enabled, updated_at = now();
  if not p_enabled then
    update public.completion_option_reminders set status = 'cancelled', updated_at = now()
    where customer_id = v_uid and status = 'pending';
  end if;
  return p_enabled;
end;
$$;
revoke all on function public.set_purchase_option_email_enabled(boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_purchase_option_email_enabled(boolean) to authenticated;

create function public.claim_preview_reward(p_reward_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_reward public.customer_rewards; v_existing public.reward_events; v_deadline timestamptz; v_credential demo_private.reward_credentials;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  select * into v_existing from public.reward_events where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.reward_id <> p_reward_id or v_existing.event_type <> 'claimed' then raise exception 'Request key reused for another action' using errcode='22023'; end if;
    select * into v_credential from demo_private.reward_credentials where reward_id = v_existing.reward_id;
    return jsonb_build_object('status','claimed','duplicate',true,'credential',v_credential.credential,'redeemable',v_credential.redeemable);
  end if;
  select * into v_reward from public.customer_rewards
    where id = p_reward_id and customer_id = v_uid and wallet_account_id = public.current_wallet_account_id() for update;
  if not found then raise exception 'Reward unavailable' using errcode = '42501'; end if;
  select greatest(v_reward.claim_expires_at, coalesce(max((e.metadata->>'newExpiresAt')::timestamptz), v_reward.claim_expires_at))
    into v_deadline from public.reward_events e where e.reward_id = v_reward.id and e.event_type = 'claim_extended';
  if v_deadline <= now() and not exists(select 1 from public.reward_events where reward_id=v_reward.id and event_type='claimed') then raise exception 'Reward claim period has expired' using errcode = 'P0001'; end if;
  if exists (select 1 from public.reward_events where reward_id = v_reward.id and event_type in ('expired','cancelled')) then
    raise exception 'Reward is no longer available' using errcode = 'P0001';
  end if;
  insert into public.reward_events(reward_id, customer_id, event_type, idempotency_key)
  values (v_reward.id, v_uid, 'claimed', p_idempotency_key)
  on conflict (reward_id) where event_type = 'claimed' do nothing;
  update public.reward_claim_reminders set status = 'cancelled', updated_at = now()
    where reward_id = v_reward.id and status = 'pending';
  select * into v_credential from demo_private.reward_credentials where reward_id = v_reward.id;
  return jsonb_build_object('status','claimed','duplicate',false,'credential',v_credential.credential,'redeemable',v_credential.redeemable,'claimExpiresAt',v_deadline);
end;
$$;
revoke all on function public.claim_preview_reward(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.claim_preview_reward(uuid,text) to authenticated;

-- Support may extend an unclaimed reward, but never after reassignment or a
-- terminal event. The reason and exact new deadline are retained forever.
create function public.extend_reward_claim_deadline(
  p_reward_id uuid,
  p_new_expires_at timestamptz,
  p_reason text,
  p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_reward public.customer_rewards;
begin
  if p_reason is null or length(trim(p_reason)) < 3 or length(p_reason) > 500
     or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid extension request' using errcode = '22023';
  end if;
  select * into v_reward from public.customer_rewards where id = p_reward_id for update;
  if not found or p_new_expires_at <= greatest(now(), v_reward.claim_expires_at) then
    raise exception 'Extension must move the deadline forward' using errcode = '22023';
  end if;
  if exists (select 1 from public.reward_events where reward_id = p_reward_id and event_type in ('claimed','expired','cancelled','redeemed')) then
    raise exception 'Claim deadline can no longer be extended' using errcode = 'P0001';
  end if;
  insert into public.reward_events(reward_id, customer_id, event_type, idempotency_key, reason, metadata)
  values (v_reward.id, v_reward.customer_id, 'claim_extended', p_idempotency_key, trim(p_reason), jsonb_build_object('newExpiresAt', p_new_expires_at));
  return jsonb_build_object('status','extended','claimExpiresAt',p_new_expires_at);
end;
$$;
revoke all on function public.extend_reward_claim_deadline(uuid,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.extend_reward_claim_deadline(uuid,timestamptz,text,text) to service_role;

-- Called only after a verified external payment event. Entries are never
-- refunded; the paid entry amount remains the disclosed credit toward the
-- retailer gift card's fixed advertised value.
create function public.record_retailer_gift_card_purchase(
  p_completion_option_id uuid,
  p_provider_event_id text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_option public.completion_options; v_reward public.customer_rewards; v_order public.customer_orders;
begin
  if p_provider_event_id is null or length(p_provider_event_id) < 8 or length(p_provider_event_id) > 200 then
    raise exception 'Invalid provider event' using errcode = '22023';
  end if;
  select * into v_order from public.customer_orders where provider_event_id = p_provider_event_id;
  if found then
    if v_order.completion_option_id <> p_completion_option_id then raise exception 'Provider event reused for another option' using errcode='22023'; end if;
    return jsonb_build_object('orderNumber',v_order.order_number,'duplicate',true);
  end if;
  select * into v_option from public.completion_options where id = p_completion_option_id for update;
  if not found or v_option.expires_at <= now() then raise exception 'Purchase option unavailable' using errcode = 'P0001'; end if;
  if exists (select 1 from public.completion_option_events where completion_option_id = v_option.id and event_type in ('declined','purchased','cancelled','expired')) then
    raise exception 'Purchase option is no longer available' using errcode = 'P0001';
  end if;
  insert into public.customer_rewards(customer_entry_id, customer_id, wallet_account_id, wallet_scope, currency, source)
  values (v_option.customer_entry_id, v_option.customer_id, v_option.wallet_account_id, v_option.wallet_scope, v_option.currency, 'purchase')
  returning * into v_reward;
  insert into public.customer_orders(
    order_number, customer_id, wallet_account_id, completion_option_id, reward_id,
    provider_event_id, subtotal_cents, total_cents, currency
  ) values (
    'ord_' || replace(gen_random_uuid()::text, '-', ''), v_option.customer_id, v_option.wallet_account_id,
    v_option.id, v_reward.id, p_provider_event_id, v_option.remaining_cents, v_option.remaining_cents, v_option.currency
  ) returning * into v_order;
  insert into public.completion_option_events(
    completion_option_id, customer_id, wallet_account_id, event_type, idempotency_key, metadata
  ) values (
    v_option.id, v_option.customer_id, v_option.wallet_account_id, 'purchased',
    'purchase_' || replace(gen_random_uuid()::text, '-', ''), jsonb_build_object('orderNumber', v_order.order_number)
  );
  insert into public.order_events(order_id, customer_id, event_type, provider_event_id)
  values (v_order.id, v_order.customer_id, 'payment_confirmed', p_provider_event_id || '_confirmed');
  update public.completion_option_reminders set status = 'cancelled', updated_at = now()
    where completion_option_id = v_option.id and status = 'pending';
  insert into demo_private.reward_alternate_events(alternate_id,reward_id,alternate_entry_id,event_type,reason)
  select id,reward_id,alternate_entry_id,'disqualified','Purchased retailer gift-card option'
    from demo_private.reward_alternates
    where alternate_entry_id = v_option.customer_entry_id and selected_at is null and disqualified_at is null
  on conflict (alternate_id,event_type) do nothing;
  update demo_private.reward_alternates set disqualified_at = now(), disqualification_reason = 'Purchased retailer gift-card option'
    where alternate_entry_id = v_option.customer_entry_id and selected_at is null and disqualified_at is null;
  return jsonb_build_object('orderNumber',v_order.order_number,'rewardId',v_reward.id,'duplicate',false);
end;
$$;
revoke all on function public.record_retailer_gift_card_purchase(uuid,text) from public, anon, authenticated;
revoke all on function public.record_retailer_gift_card_purchase(uuid,text) from service_role;

-- State derives from immutable records, including the current server time.
create function demo_private.option_status(p_id uuid) returns text
language sql stable security definer set search_path='' as $$
 select coalesce((select event_type from public.completion_option_events
   where completion_option_id=p_id and event_type in ('declined','purchased','cancelled','expired')
   order by created_at desc, id desc limit 1),
   (select case when expires_at<=now() then 'expired' else 'available' end from public.completion_options where id=p_id));
$$;
create function demo_private.reward_deadline(p_id uuid) returns timestamptz
language sql stable security definer set search_path='' as $$
 select greatest(r.claim_expires_at, coalesce((select max((metadata->>'newExpiresAt')::timestamptz)
   from public.reward_events where reward_id=r.id and event_type='claim_extended'), r.claim_expires_at))
 from public.customer_rewards r where r.id=p_id;
$$;
create function demo_private.reward_status(p_id uuid) returns text
language sql stable security definer set search_path='' as $$
 select coalesce((select event_type from public.reward_events
   where reward_id=p_id and event_type in ('redeemed','expired','cancelled') order by created_at desc,id desc limit 1),
   case when r.source='winner' and demo_private.reward_deadline(r.id)<=now()
       and not exists(select 1 from public.reward_events where reward_id=r.id and event_type='claimed') then 'expired'
   else coalesce((select case event_type when 'issuance_ready' then 'ready' else event_type end
     from public.reward_events where reward_id=r.id and event_type in ('issuance_pending','issuance_failed','issuance_ready')
     order by created_at desc,id desc limit 1),'ready') end)
 from public.customer_rewards r where r.id=p_id;
$$;
revoke all on function demo_private.option_status(uuid), demo_private.reward_deadline(uuid), demo_private.reward_status(uuid) from public,anon,authenticated,service_role;

-- A service worker calls this in a transaction. It returns an unclaimed
-- winner's original entry amount to playable balance, records the expiration,
-- and promotes the next recorded eligible alternate without rewriting a draw.
create function public.process_expired_winner_rewards(p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_reward public.customer_rewards; v_entry public.customer_entries;
 v_alternate demo_private.reward_alternates; v_new_reward public.customer_rewards;
 v_processed integer := 0; v_reassigned integer := 0;
begin
  if p_limit < 1 or p_limit > 250 then raise exception 'Invalid processing limit' using errcode='22023'; end if;
  for v_reward in
    select r.* from public.customer_rewards r
    where r.source='winner' and demo_private.reward_deadline(r.id)<=now()
      and not exists(select 1 from public.reward_events e where e.reward_id=r.id and e.event_type in ('claimed','expired','cancelled','redeemed'))
    order by demo_private.reward_deadline(r.id),r.id
    for update skip locked limit p_limit
  loop
    select * into v_entry from public.customer_entries where id=v_reward.customer_entry_id;
    insert into public.reward_events(reward_id,customer_id,event_type,idempotency_key,reason)
    values(v_reward.id,v_reward.customer_id,'expired','expire_'||replace(v_reward.id::text,'-',''),'Claim period ended without reveal');
    insert into public.ledger_entries(
      ledger_entry_id,customer_id,wallet_account_id,wallet_scope,entry_type,balance_type,
      amount,source_event,related_entry_id,currency
    ) values(
      'len_'||replace(gen_random_uuid()::text,'-',''),v_reward.customer_id,v_reward.wallet_account_id,
      v_reward.wallet_scope,'UNCLAIMED_WINNER_CREDIT','PLAYABLE',v_entry.amount,
      'unclaimed_winner_'||v_reward.id::text,v_entry.entry_id,v_reward.currency
    ) on conflict (wallet_account_id,source_event) where wallet_scope='demo' do nothing;
    update public.reward_claim_reminders set status='cancelled',updated_at=now()
      where reward_id=v_reward.id and status='pending';

    select a.* into v_alternate from demo_private.reward_alternates a
      where a.reward_id=v_reward.id and a.selected_at is null and a.disqualified_at is null
        and not exists (
          select 1 from public.completion_options c
          join public.completion_option_events ce on ce.completion_option_id=c.id and ce.event_type='purchased'
          where c.customer_entry_id=a.alternate_entry_id
        )
      order by a.position for update skip locked limit 1;
    if found then
      insert into public.customer_rewards(customer_entry_id,customer_id,wallet_account_id,wallet_scope,currency,source)
      select e.id,e.customer_id,e.wallet_account_id,e.wallet_scope,e.currency,'winner'
      from public.customer_entries e where e.id=v_alternate.alternate_entry_id
      returning * into v_new_reward;
      insert into demo_private.reward_alternate_events(alternate_id,reward_id,alternate_entry_id,event_type,reason,metadata)
      values(v_alternate.id,v_reward.id,v_alternate.alternate_entry_id,'selected','Previous winner did not claim in time',jsonb_build_object('newRewardId',v_new_reward.id));
      update demo_private.reward_alternates set selected_at=now() where id=v_alternate.id;
      insert into demo_private.reward_alternates(reward_id,alternate_entry_id,position)
      select v_new_reward.id,a.alternate_entry_id,a.position
      from demo_private.reward_alternates a
      where a.reward_id=v_reward.id and a.position>v_alternate.position and a.selected_at is null and a.disqualified_at is null
      on conflict do nothing;
      update public.completion_option_reminders set status='cancelled',updated_at=now()
        where completion_option_id in (select id from public.completion_options where customer_entry_id=v_alternate.alternate_entry_id)
          and status='pending';
      v_reassigned:=v_reassigned+1;
    end if;
    v_processed:=v_processed+1;
  end loop;
  return jsonb_build_object('processed',v_processed,'reassigned',v_reassigned);
end;
$$;
revoke all on function public.process_expired_winner_rewards(integer) from public,anon,authenticated;
grant execute on function public.process_expired_winner_rewards(integer) to service_role;

alter table public.ledger_entries drop constraint ledger_entries_entry_type_check;
alter table public.ledger_entries add constraint ledger_entries_entry_type_check check (
 entry_type in ('DEPOSIT','ENTRY_DEBIT','REBATE_CREDIT','REFUND','PAYOUT','CORRECTION','PURCHASE_DEBIT','UNCLAIMED_WINNER_CREDIT'));

-- Atomic preview checkout spends only previously verified demo-wallet funds.
-- Real card charging remains a separate provider integration.
create function public.purchase_preview_gift_card(p_option_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; v_option public.completion_options; v_order public.customer_orders;
 v_balance bigint; v_result jsonb; v_event text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then raise exception 'Invalid request' using errcode='22023'; end if;
 if not coalesce((select environment='development-test' and preview_entries_enabled and enabled
   and preview_issuer=auth.jwt()->>'iss' from demo_private.funding_config where singleton),false) then
   raise exception 'Preview checkout unavailable' using errcode='42501'; end if;
 v_wallet:=demo_private.lock_funding_wallet();
 v_event:='preview_purchase_'||auth.uid()::text||'_'||p_idempotency_key;
 select * into v_order from public.customer_orders where provider_event_id=v_event;
 if found then
   if v_order.completion_option_id<>p_option_id or v_order.wallet_account_id<>v_wallet then raise exception 'Request key reused' using errcode='22023'; end if;
   return jsonb_build_object('status','purchased','orderNumber',v_order.order_number,'duplicate',true);
 end if;
 select * into v_option from public.completion_options where id=p_option_id and customer_id=auth.uid() and wallet_account_id=v_wallet for update;
 if not found then raise exception 'Purchase option unavailable' using errcode='42501'; end if;
 if demo_private.option_status(v_option.id)<>'available' then raise exception 'Purchase option is no longer available' using errcode='P0001'; end if;
 select coalesce(sum(amount) filter(where balance_type='PLAYABLE'),0) into v_balance from public.ledger_entries where wallet_account_id=v_wallet;
 if v_balance<v_option.remaining_cents then raise exception 'Add demo funds before completing this option.' using errcode='P0001'; end if;
 if v_option.remaining_cents>0 then
   insert into public.ledger_entries(ledger_entry_id,customer_id,wallet_account_id,wallet_scope,entry_type,balance_type,amount,source_event,currency)
   values('len_'||replace(gen_random_uuid()::text,'-',''),auth.uid(),v_wallet,'demo','PURCHASE_DEBIT','PLAYABLE',-v_option.remaining_cents,v_event,'USD');
 end if;
 v_result:=public.record_retailer_gift_card_purchase(v_option.id,v_event);
 insert into public.reward_events(reward_id,customer_id,event_type,idempotency_key)
 values((v_result->>'rewardId')::uuid,auth.uid(),'claimed','purchase_claim_'||replace(v_option.id::text,'-',''));
 insert into public.order_events(order_id,customer_id,event_type,provider_event_id)
 select id,customer_id,'fulfilled',v_event||'_issued' from public.customer_orders where order_number=v_result->>'orderNumber';
 update public.reward_claim_reminders set status='cancelled',updated_at=now() where reward_id=(v_result->>'rewardId')::uuid and status='pending';
 return v_result||jsonb_build_object('status','purchased');
end;
$$;
revoke all on function public.purchase_preview_gift_card(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.purchase_preview_gift_card(uuid,text) to authenticated;

create function public.get_claimed_reward(p_reward_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_reward public.customer_rewards; v_credential demo_private.reward_credentials;
begin
 select * into v_reward from public.customer_rewards where id=p_reward_id and customer_id=auth.uid()
   and wallet_account_id=public.current_wallet_account_id();
 if not found then raise exception 'Reward unavailable' using errcode='42501'; end if;
 if not exists(select 1 from public.reward_events where reward_id=v_reward.id and event_type='claimed')
    or demo_private.reward_status(v_reward.id) in ('expired','cancelled','issuance_pending','issuance_failed') then return null; end if;
 select * into v_credential from demo_private.reward_credentials where reward_id=v_reward.id;
 return jsonb_build_object('code',v_credential.credential,'redeemable',v_credential.redeemable,'provider',v_credential.provider);
end;
$$;
revoke all on function public.get_claimed_reward(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_claimed_reward(uuid) to authenticated;

create function public.get_purchase_option_email_enabled() returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return coalesce((select purchase_option_email_enabled from public.customer_communication_preferences where customer_id=auth.uid()),true);
end;
$$;
revoke all on function public.get_purchase_option_email_enabled() from public,anon,authenticated,service_role;
grant execute on function public.get_purchase_option_email_enabled() to authenticated;

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
      c.id as completion_option_id,
      cs.option_status as completion_option_status,
      c.expires_at as completion_expires_at,
      r.id as reward_id,
      rs.reward_status,
      demo_private.reward_deadline(r.id) as reward_claim_expires_at,
      rs.claimed_at as reward_claimed_at,
      e.created_at
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
      select
        demo_private.reward_status(r.id) as reward_status,
        (select re.created_at from public.reward_events re
          where re.reward_id = r.id and re.event_type = 'claimed'
          order by re.created_at desc limit 1) as claimed_at
    ) rs on r.id is not null
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet
  ) a;
  return v_rows;
end;
$$;
revoke all on function public.get_account_activity() from public, anon, authenticated, service_role;
grant execute on function public.get_account_activity() to authenticated;

create function public.get_account_orders()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.order_number desc), '[]'::jsonb)
  into v_rows from (
    select o.order_number, e.offering_slug as reward_slug, p.title, p.retailer,
      p.image_path as image, r.face_value_cents, o.total_cents as amount_paid_cents,
      coalesce((select oe.event_type from public.order_events oe
        where oe.order_id = o.id order by oe.created_at desc, oe.id desc limit 1), 'payment_confirmed') as status,
      o.created_at
    from public.customer_orders o
    join public.customer_rewards r on r.id = o.reward_id
    join public.customer_entries e on e.id = r.customer_entry_id
    join demo_private.preview_entry_offerings p on p.slug = e.offering_slug
    where o.customer_id = auth.uid() and o.wallet_account_id = v_wallet
  ) x;
  return v_rows;
end;
$$;
revoke all on function public.get_account_orders() from public, anon, authenticated, service_role;
grant execute on function public.get_account_orders() to authenticated;

commit;
