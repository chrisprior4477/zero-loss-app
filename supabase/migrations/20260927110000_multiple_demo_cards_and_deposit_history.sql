-- Multiple fixed preview cards. No PAN, CVV or real processor token is stored.
begin;

alter table demo_private.funding_payment_methods drop constraint funding_payment_methods_customer_id_fkey;
alter table demo_private.customer_payment_methods drop constraint customer_payment_methods_pkey;
alter table demo_private.customer_payment_methods drop constraint customer_payment_methods_provider_token_check;
alter table demo_private.customer_payment_methods drop constraint customer_payment_methods_last_four_check;
alter table demo_private.customer_payment_methods add constraint customer_payment_methods_fixture_check check (
  (provider_token,last_four) in (('demo_card_4242','4242'),('demo_card_5556','5556'),('demo_card_1881','1881'),('demo_card_0002','0002'))
);
alter table demo_private.customer_payment_methods add primary key(customer_id,provider_token);
create unique index customer_one_default_demo_card on demo_private.customer_payment_methods(customer_id) where is_default;
alter table demo_private.funding_payment_methods drop constraint funding_payment_methods_provider_token_check;
alter table demo_private.funding_payment_methods add constraint funding_payment_methods_fixture_check check (
  provider_token in ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002')
);
alter table demo_private.funding_payment_methods add constraint funding_payment_methods_saved_card_fkey
  foreign key(customer_id,provider_token) references demo_private.customer_payment_methods(customer_id,provider_token) on delete restrict;
alter table demo_private.funding_authorizations drop constraint funding_authorizations_payment_method_check;
alter table demo_private.funding_authorizations add constraint funding_authorizations_fixture_check check (
  payment_method in ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002')
);

create function public.get_demo_payment_methods() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  perform demo_private.assert_card_environment();
  if not public.is_demo_payment_enabled() then raise exception 'Funding is unavailable' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default)
    order by is_default desc,created_at,provider_token),'[]'::jsonb) into v_result
    from demo_private.customer_payment_methods where customer_id=auth.uid();
  return v_result;
end $$;
revoke all on function public.get_demo_payment_methods() from public,anon,authenticated,service_role;
grant execute on function public.get_demo_payment_methods() to authenticated;

create or replace function public.get_demo_payment_method() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  perform demo_private.assert_card_environment();
  if not public.is_demo_payment_enabled() then raise exception 'Funding is unavailable' using errcode='42501'; end if;
  select jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default) into v_result
    from demo_private.customer_payment_methods where customer_id=auth.uid()
    order by is_default desc,created_at,provider_token limit 1;
  return v_result;
end $$;

create or replace function public.save_demo_payment_method(p_payment_method text,p_make_default boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; v_last_four text; v_default boolean;
begin
  perform demo_private.assert_card_environment();
  v_last_four:=case p_payment_method when 'demo_card_4242' then '4242' when 'demo_card_5556' then '5556'
    when 'demo_card_1881' then '1881' when 'demo_card_0002' then '0002' end;
  if v_last_four is null or p_make_default is null then raise exception 'Only supplied test cards are supported' using errcode='22023'; end if;
  v_wallet:=demo_private.lock_funding_wallet();
  v_default:=p_make_default;
  if v_default then update demo_private.customer_payment_methods set is_default=false,updated_at=clock_timestamp()
    where customer_id=auth.uid() and is_default; end if;
  insert into demo_private.customer_payment_methods(customer_id,provider_token,last_four,is_default)
    values(auth.uid(),p_payment_method,v_last_four,v_default)
    on conflict(customer_id,provider_token) do update set is_default=excluded.is_default,updated_at=clock_timestamp();
  return jsonb_build_object('token',p_payment_method,'lastFour',v_last_four,'isDefault',v_default);
end $$;

create or replace function public.create_demo_card_funding_session(
  p_amount integer,p_idempotency_key text,p_payment_method text,p_make_default boolean
) returns public.demo_funding_sessions language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; v_session public.demo_funding_sessions; v_method demo_private.funding_payment_methods;
  v_last_four text; v_default boolean;
begin
  perform demo_private.assert_card_environment();
  v_last_four:=case p_payment_method when 'demo_card_4242' then '4242' when 'demo_card_5556' then '5556'
    when 'demo_card_1881' then '1881' when 'demo_card_0002' then '0002' end;
  if v_last_four is null or p_make_default is null then raise exception 'Only supplied test cards are supported' using errcode='22023'; end if;
  v_wallet:=demo_private.lock_funding_wallet();
  v_session:=public.create_demo_funding_session(p_amount,p_idempotency_key);
  select * into v_method from demo_private.funding_payment_methods where session_id=v_session.id;
  if found then
    if v_method.provider_token<>p_payment_method or v_method.make_default<>p_make_default then
      raise exception 'Payment method differs from the original request' using errcode='22023';
    end if;
    return v_session;
  end if;
  if v_session.status<>'created' then raise exception 'Recover the original request instead' using errcode='22023'; end if;
  v_default:=p_make_default;
  if v_default then update demo_private.customer_payment_methods set is_default=false,updated_at=clock_timestamp()
    where customer_id=auth.uid() and is_default; end if;
  insert into demo_private.customer_payment_methods(customer_id,provider_token,last_four,is_default)
    values(auth.uid(),p_payment_method,v_last_four,v_default)
    on conflict(customer_id,provider_token) do update set is_default=excluded.is_default,updated_at=clock_timestamp();
  insert into demo_private.funding_payment_methods(session_id,customer_id,provider_token,make_default)
    values(v_session.id,auth.uid(),p_payment_method,p_make_default);
  return v_session;
end $$;

create function public.authorize_demo_funding(
  p_amount integer,p_request_key text,p_payment_method text,p_make_default boolean,p_policy_version text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; v_password_at timestamptz; v_session uuid; v_row demo_private.funding_authorizations;
begin
  perform demo_private.assert_card_environment();
  v_wallet:=demo_private.lock_funding_wallet();
  if p_amount is null or p_amount not between 100 and 50000 or p_request_key is null
    or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$' or p_payment_method not in
      ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002')
    or p_make_default is null or p_policy_version is distinct from 'funding-confirmation-v1' then
    raise exception 'Invalid funding confirmation' using errcode='22023'; end if;
  select max(to_timestamp((m->>'timestamp')::double precision)) into v_password_at
    from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) m where m->>'method'='password';
  v_session:=(auth.jwt()->>'session_id')::uuid;
  if v_session is null or v_password_at is null or v_password_at<clock_timestamp()-interval '60 seconds'
    or v_password_at>clock_timestamp()+interval '5 seconds' then
    raise exception 'Confirm this deposit with your password again.' using errcode='P0001'; end if;
  select * into v_row from demo_private.funding_authorizations where customer_id=auth.uid()
    and request_key=p_request_key order by created_at desc limit 1 for update;
  if found then
    if v_row.amount<>p_amount or v_row.payment_method<>p_payment_method or v_row.make_default<>p_make_default
      or v_row.wallet_account_id<>v_wallet then
      raise exception 'This confirmation belongs to a different deposit.' using errcode='22023'; end if;
    if v_row.consumed_by is not null or v_row.expires_at>clock_timestamp() then return v_row.id; end if;
  end if;
  if (select count(*) from demo_private.funding_authorizations where customer_id=auth.uid()
    and created_at>clock_timestamp()-interval '1 minute')>=3 then
    raise exception 'Please wait a minute before confirming another deposit.' using errcode='P0001'; end if;
  insert into demo_private.funding_authorizations(customer_id,wallet_account_id,request_key,amount,payment_method,
    make_default,policy_version,auth_session_id,authenticated_at)
    values(auth.uid(),v_wallet,p_request_key,p_amount,p_payment_method,p_make_default,p_policy_version,v_session,v_password_at)
    returning id into v_session;
  return v_session;
end $$;
revoke all on function public.authorize_demo_funding(integer,text,text,boolean,text) from public,anon,authenticated,service_role;
grant execute on function public.authorize_demo_funding(integer,text,text,boolean,text) to authenticated;

-- Deposits must not silently stop at the previous 20-row history cap.
create or replace function public.get_demo_funding_requests() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_wallet uuid:=public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc),'[]'::jsonb) into v_rows from (
    select s.id,s.amount,s.currency,s.status,s.created_at,
      case when p.event_id is null and a.event_id is null and l.id is null and s.status='created' then 'not_processed'
        when p.event_id is not null and a.event_id is null and l.id is null and s.status in ('created','processing','timed_out') then 'credit_pending'
        when p.event_id=a.event_id and a.ledger_id=l.id and s.status='succeeded'
          and s.provider_event_id=p.event_id::text and l.amount=s.amount and l.currency=s.currency
          and l.wallet_account_id=s.wallet_account_id and l.customer_id=s.customer_id then 'reconciled'
        else 'discrepancy' end as reconciliation
    from public.demo_funding_sessions s
    left join demo_private.provider_receipts p on p.session_id=s.id
    left join demo_private.accepted_events a on a.session_id=s.id
    left join public.ledger_entries l on l.demo_funding_session_id=s.id
    where s.customer_id=auth.uid() and s.wallet_account_id=v_wallet
    order by s.created_at desc,s.id desc
  ) r;
  return v_rows;
end $$;
notify pgrst,'reload schema';
commit;
