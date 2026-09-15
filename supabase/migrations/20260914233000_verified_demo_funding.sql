-- Checkpoint two. No production payment, entry purchase, outcome or reward writer.
-- The simulated provider is durable but lives in this test database, not outside it.
begin;

create schema demo_private;
revoke all on schema demo_private from public, anon, authenticated, service_role;
create table demo_private.funding_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  environment text not null default 'development-test' check (environment = 'development-test'),
  signing_key bytea not null default extensions.gen_random_bytes(32) check (octet_length(signing_key) = 32)
);
insert into demo_private.funding_config default values;
alter table demo_private.funding_config enable row level security;
revoke all on demo_private.funding_config from public, anon, authenticated, service_role;
alter table public.demo_payment_accounts add column funding_enabled boolean not null default false;

create table demo_private.provider_receipts (
  event_id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.demo_funding_sessions(id) on delete restrict,
  body text not null,
  signature text not null check (signature ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create table demo_private.accepted_events (
  event_id uuid primary key references demo_private.provider_receipts(event_id) on delete restrict,
  session_id uuid not null unique references public.demo_funding_sessions(id) on delete restrict,
  ledger_id uuid not null unique references public.ledger_entries(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table demo_private.provider_receipts enable row level security;
alter table demo_private.accepted_events enable row level security;
revoke all on demo_private.provider_receipts, demo_private.accepted_events from public, anon, authenticated, service_role;
create trigger provider_receipts_immutable before update or delete on demo_private.provider_receipts
  for each row execute function public.reject_financial_history_mutation();
create trigger provider_receipts_no_truncate before truncate on demo_private.provider_receipts
  for each statement execute function public.reject_financial_history_mutation();
create trigger accepted_events_immutable before update or delete on demo_private.accepted_events
  for each row execute function public.reject_financial_history_mutation();
create trigger accepted_events_no_truncate before truncate on demo_private.accepted_events
  for each statement execute function public.reject_financial_history_mutation();

alter table public.ledger_entries add column demo_funding_session_id uuid
  references public.demo_funding_sessions(id) on delete restrict;
alter table public.demo_funding_sessions add constraint demo_funding_posting_identity
  unique (id,wallet_account_id,customer_id,amount,currency);
alter table public.ledger_entries add constraint ledger_demo_funding_identity foreign key
  (demo_funding_session_id,wallet_account_id,customer_id,amount,currency)
  references public.demo_funding_sessions(id,wallet_account_id,customer_id,amount,currency) on delete restrict;
create unique index ledger_demo_funding_session_once on public.ledger_entries(demo_funding_session_id)
  where demo_funding_session_id is not null;
alter table public.ledger_entries add constraint ledger_demo_funding_shape check (
  demo_funding_session_id is null or (wallet_scope = 'demo' and currency = 'USD'
    and entry_type = 'DEPOSIT' and balance_type = 'PLAYABLE' and amount > 0)
);

-- Same lock order everywhere: customer -> enrollment -> wallet -> session.
-- Private helper cannot be invoked through the Data API.
create function demo_private.lock_funding_wallet() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_wallet uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users where id = v_uid and email_confirmed_at is not null) then
    raise exception 'An active, email-confirmed account is required' using errcode = '42501';
  end if;
  perform 1 from public.customers where id = v_uid and status = 'active'
    and verification_status = 'email_verified' for update;
  if not found then raise exception 'An active, email-confirmed account is required' using errcode = '42501'; end if;
  perform 1 from public.demo_payment_accounts where customer_id = v_uid and enabled and funding_enabled for update;
  if not found or not coalesce((select enabled from demo_private.funding_config where singleton), false) then
    raise exception 'Demo funding is not enabled for this account' using errcode = '42501';
  end if;
  select id into v_wallet from public.wallet_accounts where customer_id = v_uid and scope = 'demo' and closed_at is null for update;
  if v_wallet is null then raise exception 'Demo wallet has not been initialized' using errcode = '55000'; end if;
  return v_wallet;
end $$;
revoke all on function demo_private.lock_funding_wallet() from public, anon, authenticated, service_role;

create or replace function public.is_demo_payment_enabled() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.demo_payment_accounts a join public.customers c on c.id = a.customer_id
    join public.wallet_accounts w on w.customer_id = c.id and w.scope = 'demo' and w.closed_at is null
    cross join demo_private.funding_config f
    where a.customer_id = auth.uid() and a.enabled and a.funding_enabled and f.enabled
      and c.status = 'active' and c.verification_status = 'email_verified'
      and exists (select 1 from auth.users u where u.id = c.id and u.email_confirmed_at is not null)
  );
$$;
revoke all on function public.is_demo_payment_enabled() from public, anon, authenticated, service_role;
grant execute on function public.is_demo_payment_enabled() to authenticated;

create or replace function public.create_demo_funding_session(p_amount integer, p_idempotency_key text)
returns public.demo_funding_sessions language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid := demo_private.lock_funding_wallet(); v_session public.demo_funding_sessions;
begin
  if p_amount is null or p_amount < 100 or p_amount > 50000 then
    raise exception 'Funding amount must be between 100 and 50000 cents' using errcode = '22023';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  select * into v_session from public.demo_funding_sessions where customer_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if v_session.amount <> p_amount or v_session.wallet_account_id <> v_wallet then
      raise exception 'Idempotency key belongs to a different funding request' using errcode = '22023';
    end if;
    return v_session; -- retries consume no additional allowance
  end if;
  -- All checks are serialized under the customer lock. Limits survive run resets.
  if (select count(*) from public.demo_funding_sessions where customer_id = auth.uid() and created_at > clock_timestamp() - interval '1 minute') >= 3 then
    raise exception 'Demo limit: three new requests per minute. Retry this request later.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.demo_funding_sessions where customer_id = auth.uid() and created_at > clock_timestamp() - interval '24 hours') >= 20 then
    raise exception 'Demo limit: twenty new requests per day.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.demo_funding_sessions where customer_id = auth.uid() and status in ('created','processing','timed_out')) >= 3 then
    raise exception 'Resolve your pending demo payments before starting another.' using errcode = 'P0001';
  end if;
  if (select coalesce(sum(amount), 0) from public.demo_funding_sessions where customer_id = auth.uid()) + p_amount > 100000 then
    raise exception 'Demo limit: $1,000 total requested per account.' using errcode = 'P0001';
  end if;
  insert into public.demo_funding_sessions(customer_id, amount, idempotency_key, wallet_account_id)
    values (auth.uid(), p_amount, p_idempotency_key, v_wallet) returning * into v_session;
  return v_session;
end $$;
revoke all on function public.create_demo_funding_session(integer,text) from public, anon, authenticated, service_role;
grant execute on function public.create_demo_funding_session(integer,text) to authenticated;

-- A replaceable simulated provider: records one successful payment, but posts
-- NO ledger credit. Return this exact durable signed receipt on every retry.
create function public.simulate_demo_payment(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid := demo_private.lock_funding_wallet(); v_s public.demo_funding_sessions;
  v_r demo_private.provider_receipts; v_event uuid := gen_random_uuid(); v_body text; v_key bytea;
begin
  select * into v_s from public.demo_funding_sessions
    where id = p_session_id and customer_id = auth.uid() and wallet_account_id = v_wallet for update;
  if not found then raise exception 'Funding request not found' using errcode = '42501'; end if;
  select * into v_r from demo_private.provider_receipts where session_id = v_s.id;
  if not found then
    if v_s.status not in ('created','processing','timed_out') then raise exception 'Funding state requires review' using errcode = '55000'; end if;
    v_body := jsonb_build_object('version',1,'provider','zero-loss-demo','eventId',v_event,
      'sessionId',v_s.id,'customerId',v_s.customer_id,'walletAccountId',v_s.wallet_account_id,
      'amountCents',v_s.amount,'currency',v_s.currency,'status','succeeded','occurredAt',clock_timestamp())::text;
    select signing_key into strict v_key from demo_private.funding_config where singleton;
    insert into demo_private.provider_receipts(event_id,session_id,body,signature)
      values (v_event,v_s.id,v_body,encode(extensions.hmac(convert_to(v_body,'UTF8'),v_key,'sha256'),'hex')) returning * into v_r;
    update public.demo_funding_sessions set status = 'processing', updated_at = clock_timestamp() where id = v_s.id;
  end if;
  return jsonb_build_object('body',v_r.body,'signature',v_r.signature);
end $$;
revoke all on function public.simulate_demo_payment(uuid) from public, anon, authenticated, service_role;
grant execute on function public.simulate_demo_payment(uuid) to authenticated;

-- Verify raw bytes BEFORE interpreting fields; also require a matching durable
-- provider record. Signature is replayable only as an idempotent redelivery.
create function public.accept_demo_payment_event(p_body text, p_signature text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid := demo_private.lock_funding_wallet(); v_key bytea; v_expected bytea; v_given bytea;
  v_diff integer := 0; v_i integer; v_j jsonb; v_r demo_private.provider_receipts;
  v_s public.demo_funding_sessions; v_ledger uuid; v_old demo_private.accepted_events;
begin
  if p_body is null or octet_length(p_body) > 4096 or p_signature is null or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid payment signature' using errcode = '22023';
  end if;
  select signing_key into strict v_key from demo_private.funding_config where singleton;
  v_expected := extensions.hmac(convert_to(p_body,'UTF8'),v_key,'sha256'); v_given := decode(p_signature,'hex');
  for v_i in 0..31 loop v_diff := v_diff | (get_byte(v_expected,v_i) # get_byte(v_given,v_i)); end loop;
  if v_diff <> 0 then raise exception 'Invalid payment signature' using errcode = '22023'; end if;
  v_j := p_body::jsonb;
  select * into v_s from public.demo_funding_sessions where id = (v_j->>'sessionId')::uuid
    and customer_id = auth.uid() and wallet_account_id = v_wallet for update;
  if not found then raise exception 'Funding request not found' using errcode = '42501'; end if;
  select * into v_r from demo_private.provider_receipts where session_id = v_s.id and event_id = (v_j->>'eventId')::uuid;
  if not found or v_r.body <> p_body or v_r.signature <> p_signature
    or v_j->>'provider' <> 'zero-loss-demo' or v_j->>'version' <> '1'
    or v_j->>'status' <> 'succeeded' or v_j->>'currency' <> 'USD'
    or v_j->>'amountCents' <> v_s.amount::text or v_j->>'customerId' <> auth.uid()::text
    or v_j->>'walletAccountId' <> v_wallet::text then
    raise exception 'Payment does not match its funding request' using errcode = '22023';
  end if;
  select * into v_old from demo_private.accepted_events where session_id = v_s.id;
  if found then
    if v_old.event_id <> v_r.event_id or v_s.status <> 'succeeded' then raise exception 'Funding discrepancy requires review' using errcode = '55000'; end if;
    return jsonb_build_object('status','succeeded','sessionId',v_s.id,'ledgerId',v_old.ledger_id,'duplicate',true);
  end if;
  if v_s.status not in ('created','processing','timed_out') then raise exception 'Funding state requires review' using errcode = '55000'; end if;
  insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,
    source_event,wallet_account_id,wallet_scope,demo_funding_session_id)
    values ('len_' || replace(gen_random_uuid()::text,'-',''),auth.uid(),'DEPOSIT','PLAYABLE',v_s.amount,'USD',
      'demo_payment_' || v_r.event_id::text,v_wallet,'demo',v_s.id) returning id into v_ledger;
  insert into demo_private.accepted_events(event_id,session_id,ledger_id) values (v_r.event_id,v_s.id,v_ledger);
  update public.demo_funding_sessions set status = 'succeeded', provider_event_id = v_r.event_id::text,
    updated_at = clock_timestamp() where id = v_s.id;
  return jsonb_build_object('status','succeeded','sessionId',v_s.id,'ledgerId',v_ledger,'duplicate',false);
end $$;
revoke all on function public.accept_demo_payment_event(text,text) from public, anon, authenticated, service_role;
grant execute on function public.accept_demo_payment_event(text,text) to authenticated;

-- Owner-scoped reconciliation is read-only. The explicit retry action retrieves
-- the SAME provider receipt and sends it through the same verified consumer.
create function public.get_demo_funding_requests() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) into v_rows from (
    select s.id, s.amount, s.currency, s.status, s.created_at,
      case when p.event_id is null and a.event_id is null and l.id is null and s.status = 'created' then 'not_processed'
        when p.event_id is not null and a.event_id is null and l.id is null and s.status in ('created','processing','timed_out') then 'credit_pending'
        when p.event_id = a.event_id and a.ledger_id = l.id and s.status = 'succeeded'
          and s.provider_event_id = p.event_id::text and l.amount = s.amount and l.currency = s.currency
          and l.wallet_account_id = s.wallet_account_id and l.customer_id = s.customer_id then 'reconciled'
        else 'discrepancy' end as reconciliation
    from public.demo_funding_sessions s
    left join demo_private.provider_receipts p on p.session_id = s.id
    left join demo_private.accepted_events a on a.session_id = s.id
    left join public.ledger_entries l on l.demo_funding_session_id = s.id
    where s.customer_id = auth.uid() and s.wallet_account_id = v_wallet
    order by s.created_at desc, s.id desc limit 20
  ) r;
  return v_rows;
end $$;
revoke all on function public.get_demo_funding_requests() from public, anon, authenticated, service_role;
grant execute on function public.get_demo_funding_requests() to authenticated;

create or replace function public.get_wallet_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid := public.current_wallet_account_id(); v_scope text := 'production';
  v_balance bigint; v_count bigint; v_entries jsonb;
begin
  if v_id is not null then select scope into strict v_scope from public.wallet_accounts where id = v_id and customer_id = auth.uid(); end if;
  select coalesce(sum(amount) filter (where balance_type = 'PLAYABLE'),0), count(*) into v_balance,v_count
    from public.ledger_entries where wallet_account_id = v_id and customer_id = auth.uid();
  select coalesce(jsonb_agg(to_jsonb(recent) order by recent.created_at desc,recent.id desc),'[]'::jsonb) into v_entries
    from (select id,entry_type,amount,created_at from public.ledger_entries
      where wallet_account_id = v_id and customer_id = auth.uid() order by created_at desc,id desc limit 50) recent;
  return jsonb_build_object('walletAccountId',v_id,'scope',v_scope,'currency','USD',
    'balanceCents',v_balance::text,'transactionCount',v_count::text,'fundingAvailable',public.is_demo_payment_enabled(),'entries',v_entries);
end $$;
revoke all on function public.get_wallet_snapshot() from public, anon, authenticated, service_role;
grant execute on function public.get_wallet_snapshot() to authenticated;
notify pgrst, 'reload schema';
commit;
