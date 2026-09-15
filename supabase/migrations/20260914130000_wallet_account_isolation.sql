-- Checkpoint 1: one database and ledger, with immutable wallet identities.
-- Run identities separate demo walkthroughs without erasing financial history.
-- Funding stays disabled until a verified provider-event consumer is installed.
begin;

-- Never silently reclassify deposits from the earlier unscoped prototype.
do $$
begin
  if exists (select 1 from public.demo_funding_sessions)
     or exists (select 1 from public.ledger_entries where source_event like 'demo_funding_%') then
    raise exception 'Unscoped demo records require explicit review before wallet migration';
  end if;
end;
$$;

create table public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  scope text not null check (scope in ('production', 'demo')),
  currency text not null default 'USD' check (currency = 'USD'),
  run_key text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (id, customer_id, scope, currency),
  unique (customer_id, run_key),
  check (
    (scope = 'production' and run_key is null and closed_at is null)
    or (scope = 'demo' and run_key is not null and run_key ~ '^[A-Za-z0-9_-]{16,128}$')
  ),
  check (closed_at is null or closed_at >= created_at)
);

create unique index wallet_accounts_one_production_per_customer
  on public.wallet_accounts(customer_id) where scope = 'production';
create unique index wallet_accounts_one_open_demo_per_customer
  on public.wallet_accounts(customer_id) where scope = 'demo' and closed_at is null;

alter table public.wallet_accounts enable row level security;
revoke all on public.wallet_accounts from public, anon, authenticated, service_role;
grant select on public.wallet_accounts to service_role;

insert into public.wallet_accounts(customer_id, scope)
select distinct customer_id, 'production' from public.ledger_entries;

alter table public.ledger_entries
  add column wallet_account_id uuid,
  add column wallet_scope text not null default 'production';

update public.ledger_entries l
set wallet_account_id = w.id
from public.wallet_accounts w
where w.customer_id = l.customer_id and w.scope = 'production';

alter table public.ledger_entries
  alter column wallet_account_id set not null,
  add constraint ledger_wallet_identity_fk
    foreign key (wallet_account_id, customer_id, wallet_scope, currency)
    references public.wallet_accounts(id, customer_id, scope, currency) on delete restrict,
  add constraint ledger_correction_identity_unique
    unique (ledger_entry_id, wallet_account_id, customer_id, wallet_scope, currency),
  add constraint ledger_correction_identity_fk
    foreign key (corrects_ledger_entry_id, wallet_account_id, customer_id, wallet_scope, currency)
    references public.ledger_entries(ledger_entry_id, wallet_account_id, customer_id, wallet_scope, currency)
    on delete restrict,
  add constraint ledger_no_self_correction check (corrects_ledger_entry_id is distinct from ledger_entry_id),
  drop constraint ledger_entries_customer_id_fkey,
  add constraint ledger_entries_customer_id_fkey foreign key (customer_id)
    references public.customers(id) on delete restrict;

create index ledger_entries_wallet_history_idx
  on public.ledger_entries(wallet_account_id, created_at desc, id desc);
create unique index ledger_entries_demo_event_once
  on public.ledger_entries(wallet_account_id, source_event) where wallet_scope = 'demo';

alter table public.demo_funding_sessions
  add column wallet_account_id uuid not null,
  add column wallet_scope text not null default 'demo' check (wallet_scope = 'demo'),
  add constraint demo_funding_wallet_identity_fk
    foreign key (wallet_account_id, customer_id, wallet_scope, currency)
    references public.wallet_accounts(id, customer_id, scope, currency) on delete restrict,
  drop constraint demo_funding_sessions_customer_id_fkey,
  add constraint demo_funding_sessions_customer_id_fkey foreign key (customer_id)
    references public.customers(id) on delete restrict;

alter table public.demo_payment_accounts
  drop constraint demo_payment_accounts_customer_id_fkey,
  add constraint demo_payment_accounts_customer_id_fkey foreign key (customer_id)
    references public.customers(id) on delete restrict;

-- A privileged application key is not permission to rewrite posted history.
create function public.reject_financial_history_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Financial history is append-only' using errcode = '55000';
end;
$$;
revoke all on function public.reject_financial_history_mutation() from public, anon, authenticated, service_role;

create trigger ledger_entries_append_only before update or delete on public.ledger_entries
  for each row execute function public.reject_financial_history_mutation();
create trigger ledger_entries_no_truncate before truncate on public.ledger_entries
  for each statement execute function public.reject_financial_history_mutation();
create trigger demo_membership_no_delete before delete on public.demo_payment_accounts
  for each row execute function public.reject_financial_history_mutation();
create trigger demo_membership_no_truncate before truncate on public.demo_payment_accounts
  for each statement execute function public.reject_financial_history_mutation();
create trigger wallet_accounts_no_delete before delete on public.wallet_accounts
  for each row execute function public.reject_financial_history_mutation();
create trigger wallet_accounts_no_truncate before truncate on public.wallet_accounts
  for each statement execute function public.reject_financial_history_mutation();

create function public.guard_wallet_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - 'closed_at') is distinct from (to_jsonb(old) - 'closed_at')
     or old.scope <> 'demo' or old.closed_at is not null or new.closed_at is null then
    raise exception 'Wallet identity is immutable; only an open demo run can be closed' using errcode = '55000';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_wallet_identity() from public, anon, authenticated, service_role;
create trigger wallet_accounts_identity_immutable before update on public.wallet_accounts
  for each row execute function public.guard_wallet_identity();

create function public.guard_demo_session_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - array['status', 'provider_event_id', 'updated_at'])
     is distinct from (to_jsonb(old) - array['status', 'provider_event_id', 'updated_at']) then
    raise exception 'Funding session identity and amount are immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_demo_session_identity() from public, anon, authenticated, service_role;
create trigger demo_funding_identity_immutable before update on public.demo_funding_sessions
  for each row execute function public.guard_demo_session_identity();
create trigger demo_funding_no_delete before delete on public.demo_funding_sessions
  for each row execute function public.reject_financial_history_mutation();
create trigger demo_funding_no_truncate before truncate on public.demo_funding_sessions
  for each statement execute function public.reject_financial_history_mutation();

-- Application services must post via narrowly granted functions, not table writes.
revoke insert, update, delete, truncate on public.ledger_entries from service_role;
revoke all on public.demo_payment_accounts from service_role;
grant select, update(enabled) on public.demo_payment_accounts to service_role;
revoke all on public.demo_funding_sessions from service_role;
grant select on public.demo_funding_sessions to service_role;

create function public.guard_ledger_wallet_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_demo_enabled boolean;
  v_wallet public.wallet_accounts;
begin
  -- All future posting paths must use this same order when taking locks.
  perform 1 from public.customers where id = new.customer_id for update;
  select enabled into v_demo_enabled from public.demo_payment_accounts
    where customer_id = new.customer_id for update;
  if found then
    if new.wallet_scope <> 'demo' or not v_demo_enabled then
      raise exception 'Demo enrollment cannot post to a production or disabled wallet' using errcode = '42501';
    end if;
  elsif new.wallet_scope <> 'production' then
    raise exception 'Demo enrollment is required' using errcode = '42501';
  end if;
  select * into v_wallet from public.wallet_accounts where id = new.wallet_account_id for update;
  if not found or v_wallet.closed_at is not null then
    raise exception 'An open wallet account is required' using errcode = '55000';
  end if;
  -- The composite FK additionally enforces owner, scope and currency equality.
  return new;
end;
$$;
revoke all on function public.guard_ledger_wallet_insert() from public, anon, authenticated, service_role;
create trigger ledger_entries_wallet_boundary before insert on public.ledger_entries
  for each row execute function public.guard_ledger_wallet_insert();

-- No URL parameter or user metadata participates in wallet selection.
-- A disabled demo account stays demo; it must never fall back to production.
create function public.current_wallet_account_id()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_demo boolean;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select enabled into v_demo from public.demo_payment_accounts where customer_id = v_uid;
  if found then
    if not v_demo then
      raise exception 'Demo wallet access is disabled' using errcode = '42501';
    end if;
    select id into v_id from public.wallet_accounts
    where customer_id = v_uid and scope = 'demo' and closed_at is null;
    if v_id is null then
      raise exception 'Demo wallet has not been initialized' using errcode = '55000';
    end if;
  else
    select id into v_id from public.wallet_accounts
    where customer_id = v_uid and scope = 'production';
  end if;
  return v_id;
end;
$$;
revoke all on function public.current_wallet_account_id() from public, anon, authenticated, service_role;
grant execute on function public.current_wallet_account_id() to authenticated;

drop policy "Customers can select own ledger entries" on public.ledger_entries;
create policy "Customers can select own ledger entries" on public.ledger_entries
for select to authenticated using (
  customer_id = (select auth.uid())
  and wallet_account_id = (select public.current_wallet_account_id())
);

-- Sum within PostgreSQL, unaffected by the Data API's 1,000-row response cap.
-- Text encoding of bigint avoids silent precision loss in JavaScript.
create function public.get_wallet_snapshot()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_id uuid := public.current_wallet_account_id();
  v_scope text := 'production';
  v_balance bigint;
  v_count bigint;
  v_entries jsonb;
begin
  if v_id is not null then
    select scope into strict v_scope from public.wallet_accounts where id = v_id;
  end if;
  select coalesce(sum(amount) filter (where balance_type = 'PLAYABLE'), 0), count(*)
    into v_balance, v_count
  from public.ledger_entries where wallet_account_id = v_id and customer_id = auth.uid();
  select coalesce(jsonb_agg(to_jsonb(recent) order by recent.created_at desc, recent.id desc), '[]'::jsonb)
    into v_entries
  from (
    select id, entry_type, amount, created_at from public.ledger_entries
    where wallet_account_id = v_id and customer_id = auth.uid()
    order by created_at desc, id desc limit 50
  ) recent;
  return jsonb_build_object(
    'walletAccountId', v_id, 'scope', v_scope, 'currency', 'USD',
    'balanceCents', v_balance::text, 'transactionCount', v_count::text,
    'fundingAvailable', false, 'entries', v_entries
  );
end;
$$;
revoke all on function public.get_wallet_snapshot() from public, anon, authenticated, service_role;
grant execute on function public.get_wallet_snapshot() to authenticated;

-- Operator-only, idempotent run initialization/reset. Never deletes a user or
-- ledger row. Reusing a request key cannot reset the account a second time.
create function public.start_demo_wallet_run(p_customer_id uuid, p_request_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_closed timestamptz;
  v_enabled boolean;
begin
  if p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  perform 1 from public.customers where id = p_customer_id for update;
  if not found then
    raise exception 'Customer not found' using errcode = '22023';
  end if;
  if exists (select 1 from public.ledger_entries where customer_id = p_customer_id and wallet_scope = 'production') then
    raise exception 'A customer with production ledger history cannot become a demo account' using errcode = '55000';
  end if;
  insert into public.demo_payment_accounts(customer_id, enabled)
    values (p_customer_id, true) on conflict (customer_id) do nothing;
  select enabled into v_enabled from public.demo_payment_accounts
    where customer_id = p_customer_id for update;
  if not v_enabled then
    raise exception 'Demo wallet access is disabled' using errcode = '42501';
  end if;
  select id, closed_at into v_id, v_closed from public.wallet_accounts
    where customer_id = p_customer_id and run_key = p_request_key;
  if found then
    if v_closed is not null then
      raise exception 'This demo run is already closed; use a new request key' using errcode = '55000';
    end if;
    return v_id;
  end if;
  update public.wallet_accounts set closed_at = clock_timestamp()
    where customer_id = p_customer_id and scope = 'demo' and closed_at is null;
  insert into public.wallet_accounts(customer_id, scope, run_key)
    values (p_customer_id, 'demo', p_request_key) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.start_demo_wallet_run(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.start_demo_wallet_run(uuid, text) to service_role;

create or replace function public.create_demo_funding_session(p_amount integer, p_idempotency_key text)
returns public.demo_funding_sessions language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_wallet_id uuid;
  v_session public.demo_funding_sessions;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Same lock order as the operator's run reset: enrollment, then wallet.
  perform 1 from public.demo_payment_accounts where customer_id = v_uid and enabled for update;
  if not found then
    raise exception 'Demo payment access is not enabled for this account' using errcode = '42501';
  end if;
  perform 1 from public.customers where id = v_uid and status = 'active' and verification_status = 'email_verified';
  if not found then
    raise exception 'An active, email-confirmed account is required' using errcode = '42501';
  end if;
  if p_amount is null or p_amount < 100 or p_amount > 50000 then
    raise exception 'Funding amount must be between 100 and 50000 cents' using errcode = '22023';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  select id into v_wallet_id from public.wallet_accounts
    where customer_id = v_uid and scope = 'demo' and closed_at is null for update;
  if v_wallet_id is null then
    raise exception 'Demo wallet has not been initialized' using errcode = '55000';
  end if;
  select * into v_session from public.demo_funding_sessions
    where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_session.amount <> p_amount or v_session.wallet_account_id <> v_wallet_id then
      raise exception 'Idempotency key belongs to a different funding request' using errcode = '22023';
    end if;
    return v_session;
  end if;
  insert into public.demo_funding_sessions(customer_id, amount, idempotency_key, wallet_account_id)
    values (v_uid, p_amount, p_idempotency_key, v_wallet_id) returning * into v_session;
  return v_session;
end;
$$;
revoke all on function public.create_demo_funding_session(integer, text) from public, anon, authenticated, service_role;
grant execute on function public.create_demo_funding_session(integer, text) to authenticated;

-- The prototype credited money merely because a caller requested completion.
-- Retire it, including for service_role, until signed events are implemented.
create or replace function public.complete_demo_funding_session(p_session_id uuid)
returns public.demo_funding_sessions language plpgsql set search_path = '' as $$
begin
  raise exception 'Funding requires a verified provider event' using errcode = '0A000';
end;
$$;
revoke all on function public.complete_demo_funding_session(uuid) from public, anon, authenticated, service_role;

create or replace function public.is_demo_payment_enabled()
returns boolean language sql stable set search_path = '' as $$ select false; $$;
revoke all on function public.is_demo_payment_enabled() from public, anon, authenticated, service_role;
grant execute on function public.is_demo_payment_enabled() to authenticated;

commit;
