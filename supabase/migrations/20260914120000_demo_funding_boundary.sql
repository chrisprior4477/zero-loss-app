-- Provider-neutral demo funding boundary.
--
-- This migration is safe to keep in source control, but demo funding remains
-- disabled for every customer until an operator explicitly inserts that
-- customer into demo_payment_accounts. The browser cannot grant itself access.

create table public.demo_payment_accounts (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.demo_funding_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  amount integer not null check (amount between 100 and 50000),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'created'
    check (status in ('created', 'processing', 'succeeded', 'declined', 'timed_out', 'refunded')),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  provider_event_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, idempotency_key)
);

alter table public.demo_payment_accounts enable row level security;
alter table public.demo_funding_sessions enable row level security;

revoke all on public.demo_payment_accounts from anon, authenticated;
revoke all on public.demo_funding_sessions from anon, authenticated;

create or replace function public.create_demo_funding_session(
  p_amount integer,
  p_idempotency_key text
)
returns public.demo_funding_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
  v_session public.demo_funding_sessions;
begin
  if v_customer_id is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.demo_payment_accounts
    where customer_id = v_customer_id and enabled
  ) then
    raise exception 'Demo payment access is not enabled for this account';
  end if;
  if p_amount < 100 or p_amount > 50000 then
    raise exception 'Funding amount must be between 100 and 50000 cents';
  end if;
  if p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid idempotency key';
  end if;

  insert into public.demo_funding_sessions (customer_id, amount, idempotency_key)
  values (v_customer_id, p_amount, p_idempotency_key)
  on conflict (customer_id, idempotency_key) do update
    set idempotency_key = excluded.idempotency_key
  returning * into v_session;
  return v_session;
end;
$$;

create or replace function public.complete_demo_funding_session(p_session_id uuid)
returns public.demo_funding_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
  v_session public.demo_funding_sessions;
  v_event_id text;
begin
  if v_customer_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_session
  from public.demo_funding_sessions
  where id = p_session_id and customer_id = v_customer_id
  for update;

  if not found then
    raise exception 'Funding session not found';
  end if;
  if v_session.status = 'succeeded' then
    return v_session;
  end if;
  if v_session.status <> 'created' then
    raise exception 'Funding session cannot be completed from status %', v_session.status;
  end if;

  v_event_id := 'demo_funding_' || replace(v_session.id::text, '-', '');

  insert into public.ledger_entries (
    ledger_entry_id,
    customer_id,
    entry_type,
    balance_type,
    amount,
    currency,
    source_event
  ) values (
    'len_' || replace(gen_random_uuid()::text, '-', ''),
    v_customer_id,
    'DEPOSIT',
    'PLAYABLE',
    v_session.amount,
    v_session.currency,
    v_event_id
  ) on conflict do nothing;

  update public.demo_funding_sessions
  set status = 'succeeded', provider_event_id = v_event_id, updated_at = now()
  where id = v_session.id
  returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.create_demo_funding_session(integer, text) from public;
revoke all on function public.complete_demo_funding_session(uuid) from public;
grant execute on function public.create_demo_funding_session(integer, text) to authenticated;
grant execute on function public.complete_demo_funding_session(uuid) to authenticated;

create or replace function public.is_demo_payment_enabled()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.demo_payment_accounts
    where customer_id = auth.uid() and enabled
  );
$$;

revoke all on function public.is_demo_payment_enabled() from public;
grant execute on function public.is_demo_payment_enabled() to authenticated;
