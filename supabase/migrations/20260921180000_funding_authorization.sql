-- Fresh, transaction-bound password authorization. No password is stored here.
begin;
alter table demo_private.funding_config add column funding_reauth_required boolean not null default false;
-- Rollout: leave enforcement off until the matching app has deployed, then enable
-- in a separate migration. The app always verifies new requests immediately.
create table demo_private.funding_authorizations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  request_key text not null check (request_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  amount integer not null check (amount between 100 and 50000),
  currency text not null default 'USD' check (currency='USD'),
  payment_method text not null check (payment_method='demo_card_4242'),
  make_default boolean not null,
  policy_version text not null check (policy_version='funding-confirmation-v1'),
  auth_session_id uuid not null unique,
  authenticated_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default clock_timestamp()+interval '2 minutes',
  consumed_by uuid unique references public.demo_funding_sessions(id) on delete restrict,
  check (expires_at>created_at)
);
create unique index funding_authorization_consumed_once on demo_private.funding_authorizations(customer_id,request_key) where consumed_by is not null;
create index funding_authorization_lookup on demo_private.funding_authorizations(customer_id,request_key,created_at desc);
alter table demo_private.funding_authorizations enable row level security;
revoke all on demo_private.funding_authorizations from public,anon,authenticated,service_role;

create function public.authorize_demo_funding(p_amount integer,p_request_key text,p_make_default boolean,p_policy_version text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; v_password_at timestamptz; v_session uuid; v_row demo_private.funding_authorizations;
begin
  perform demo_private.assert_card_environment();
  v_wallet:=demo_private.lock_funding_wallet();
  if p_amount is null or p_amount not between 100 and 50000
    or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_make_default is null or p_policy_version is distinct from 'funding-confirmation-v1' then
    raise exception 'Invalid funding confirmation' using errcode='22023';
  end if;
  select max(to_timestamp((m->>'timestamp')::double precision)) into v_password_at
    from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) m where m->>'method'='password';
  v_session:=(auth.jwt()->>'session_id')::uuid;
  if v_session is null or v_password_at is null or v_password_at<clock_timestamp()-interval '60 seconds'
    or v_password_at>clock_timestamp()+interval '5 seconds' then
    raise exception 'Confirm this deposit with your password again.' using errcode='P0001';
  end if;
  select * into v_row from demo_private.funding_authorizations where customer_id=auth.uid() and request_key=p_request_key order by created_at desc limit 1 for update;
  if found then
    if v_row.amount<>p_amount or v_row.make_default<>p_make_default or v_row.wallet_account_id<>v_wallet then
      raise exception 'This confirmation belongs to a different deposit.' using errcode='22023';
    end if;
    if v_row.consumed_by is not null or v_row.expires_at>clock_timestamp() then return v_row.id; end if;
    -- Expired evidence is retained. A new password check creates a new record.
  end if;
  if (select count(*) from demo_private.funding_authorizations where customer_id=auth.uid()
      and created_at>clock_timestamp()-interval '1 minute')>=3 then
    raise exception 'Please wait a minute before confirming another deposit.' using errcode='P0001';
  end if;
  insert into demo_private.funding_authorizations(customer_id,wallet_account_id,request_key,amount,payment_method,
    make_default,policy_version,auth_session_id,authenticated_at)
    values(auth.uid(),v_wallet,p_request_key,p_amount,'demo_card_4242',p_make_default,p_policy_version,v_session,v_password_at)
    returning id into v_session;
  return v_session;
end $$;
revoke all on function public.authorize_demo_funding(integer,text,boolean,text) from public,anon,authenticated,service_role;
grant execute on function public.authorize_demo_funding(integer,text,boolean,text) to authenticated;

create function demo_private.require_funding_authorization() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_auth demo_private.funding_authorizations;
begin
  if not (select funding_reauth_required from demo_private.funding_config where singleton) then return new; end if;
  select * into v_auth from demo_private.funding_authorizations
    where customer_id=new.customer_id and request_key=new.idempotency_key order by created_at desc limit 1 for update;
  if not found or v_auth.customer_id is distinct from auth.uid() or v_auth.wallet_account_id<>new.wallet_account_id
    or v_auth.amount<>new.amount or v_auth.currency<>new.currency or v_auth.expires_at<=clock_timestamp()
    or v_auth.consumed_by is not null then
    raise exception 'Confirm this deposit with your password again.' using errcode='P0001';
  end if;
  -- AFTER INSERT allows this FK to reference the newly inserted session. Raising
  -- here rolls back the whole insert, including direct calls to the older RPC.
  update demo_private.funding_authorizations set consumed_by=new.id where id=v_auth.id;
  return new;
end $$;
revoke all on function demo_private.require_funding_authorization() from public,anon,authenticated,service_role;
create trigger funding_requires_authorization after insert on public.demo_funding_sessions
  for each row execute function demo_private.require_funding_authorization();

create function demo_private.require_authorized_payment_method() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if (select funding_reauth_required from demo_private.funding_config where singleton)
    and not exists(select 1 from demo_private.funding_authorizations where consumed_by=new.session_id
      and customer_id=new.customer_id and payment_method=new.provider_token and make_default=new.make_default) then
    raise exception 'Payment method differs from the confirmed deposit.' using errcode='22023';
  end if;
  return new;
end $$;
revoke all on function demo_private.require_authorized_payment_method() from public,anon,authenticated,service_role;
create trigger funding_method_authorized before insert on demo_private.funding_payment_methods
  for each row execute function demo_private.require_authorized_payment_method();
notify pgrst,'reload schema';
commit;
