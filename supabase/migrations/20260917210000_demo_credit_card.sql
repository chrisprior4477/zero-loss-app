-- A fixed simulated payment method, never a vault for real card credentials.
begin;

create table demo_private.customer_payment_methods (
  customer_id uuid primary key references public.customers(id) on delete restrict,
  provider text not null default 'zero-loss-demo' check (provider = 'zero-loss-demo'),
  provider_token text not null default 'demo_card_4242' check (provider_token = 'demo_card_4242'),
  last_four text not null default '4242' check (last_four = '4242'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Snapshot the explicit choice with the financial request. Later preference
-- changes must not change history or be repeated by an old payment retry.
create table demo_private.funding_payment_methods (
  session_id uuid primary key references public.demo_funding_sessions(id) on delete restrict,
  customer_id uuid not null references demo_private.customer_payment_methods(customer_id) on delete restrict,
  provider_token text not null check (provider_token = 'demo_card_4242'),
  make_default boolean not null,
  created_at timestamptz not null default now()
);
alter table public.demo_funding_sessions add constraint demo_funding_session_customer unique(id,customer_id);
alter table demo_private.funding_payment_methods add constraint funding_method_owner
  foreign key(session_id,customer_id) references public.demo_funding_sessions(id,customer_id) on delete restrict;
alter table demo_private.customer_payment_methods enable row level security;
alter table demo_private.funding_payment_methods enable row level security;
revoke all on demo_private.customer_payment_methods, demo_private.funding_payment_methods
  from public, anon, authenticated, service_role;
create trigger funding_payment_methods_immutable before update or delete on demo_private.funding_payment_methods
  for each row execute function public.reject_financial_history_mutation();
create trigger funding_payment_methods_no_truncate before truncate on demo_private.funding_payment_methods
  for each statement execute function public.reject_financial_history_mutation();

create function demo_private.assert_card_environment() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not coalesce((select enabled and preview_provisioning_enabled
    and environment = 'development-test' and preview_issuer = auth.jwt()->>'iss'
    from demo_private.funding_config where singleton),false) then
    raise exception 'Test cards are unavailable in this environment' using errcode = '42501';
  end if;
end $$;
revoke all on function demo_private.assert_card_environment() from public, anon, authenticated, service_role;

create function public.get_demo_payment_method() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  perform demo_private.assert_card_environment();
  if not public.is_demo_payment_enabled() then raise exception 'Funding is unavailable' using errcode = '42501'; end if;
  select jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default)
    into v_result from demo_private.customer_payment_methods where customer_id = auth.uid();
  return v_result;
end $$;

create function public.create_demo_card_funding_session(
  p_amount integer, p_idempotency_key text, p_payment_method text, p_make_default boolean
) returns public.demo_funding_sessions
language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid; v_session public.demo_funding_sessions; v_method demo_private.funding_payment_methods;
begin
  perform demo_private.assert_card_environment();
  if p_payment_method is distinct from 'demo_card_4242' or p_make_default is null then
    raise exception 'Only the supplied test card is supported' using errcode = '22023';
  end if;
  v_wallet := demo_private.lock_funding_wallet();
  -- Existing core enforces amounts, idempotency and persistent usage ceilings.
  v_session := public.create_demo_funding_session(p_amount,p_idempotency_key);
  select * into v_method from demo_private.funding_payment_methods where session_id = v_session.id;
  if found then
    if v_method.provider_token <> p_payment_method or v_method.make_default <> p_make_default then
      raise exception 'Payment method differs from the original request' using errcode = '22023';
    end if;
    return v_session;
  end if;
  -- Do not attach a new payment method to a legacy request that was already processed.
  if v_session.status <> 'created' then raise exception 'Recover the original request instead' using errcode = '22023'; end if;
  insert into demo_private.customer_payment_methods(customer_id,is_default)
    values(auth.uid(),p_make_default)
    on conflict(customer_id) do update set is_default=excluded.is_default,updated_at=clock_timestamp();
  insert into demo_private.funding_payment_methods(session_id,customer_id,provider_token,make_default)
    values(v_session.id,auth.uid(),p_payment_method,p_make_default);
  return v_session;
end $$;

-- Recovery for browser retry records created before card selection existed.
-- This endpoint can ONLY find an existing request; it cannot create a payment.
create function public.resume_demo_funding_session(p_amount integer,p_idempotency_key text)
returns public.demo_funding_sessions language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid; v_session public.demo_funding_sessions;
begin
  perform demo_private.assert_card_environment();
  v_wallet := demo_private.lock_funding_wallet();
  select * into v_session from public.demo_funding_sessions
    where customer_id=auth.uid() and wallet_account_id=v_wallet and amount=p_amount and idempotency_key=p_idempotency_key;
  if not found then raise exception 'No saved payment was found. Refresh to start a new request.' using errcode = 'P0001'; end if;
  return v_session;
end $$;

revoke all on function public.get_demo_payment_method(), public.create_demo_card_funding_session(integer,text,text,boolean),
  public.resume_demo_funding_session(integer,text) from public, anon, authenticated, service_role;
grant execute on function public.get_demo_payment_method(), public.create_demo_card_funding_session(integer,text,text,boolean),
  public.resume_demo_funding_session(integer,text) to authenticated;
notify pgrst, 'reload schema';
commit;
