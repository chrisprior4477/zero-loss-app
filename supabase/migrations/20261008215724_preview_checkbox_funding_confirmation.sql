-- In the isolated development-test MVP, a signed-in customer confirms a
-- simulated deposit by checking the amount/use acknowledgment. The existing
-- authorization, provider-session, idempotency, and ledger gates remain.
begin;

alter table demo_private.funding_authorizations
  alter column auth_session_id drop not null;
alter table demo_private.funding_authorizations
  add column confirmation_method text not null default 'password'
    check (confirmation_method in ('password', 'checkbox'));
alter table demo_private.funding_authorizations
  add constraint funding_authorization_method_evidence check (
    (confirmation_method = 'password' and auth_session_id is not null)
    or (confirmation_method = 'checkbox' and auth_session_id is null)
  );

create function public.confirm_demo_checkbox_funding(
  p_amount integer, p_request_key text, p_payment_method text,
  p_make_default boolean, p_policy_version text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_wallet uuid;
  v_row demo_private.funding_authorizations;
  v_id uuid;
begin
  perform demo_private.assert_card_environment();
  v_wallet := demo_private.lock_funding_wallet();
  if p_amount is null or p_amount not between 100 and 50000
    or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_payment_method not in ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002')
    or p_make_default is null or p_policy_version is distinct from 'funding-confirmation-v1' then
    raise exception 'Invalid demo deposit confirmation' using errcode = '22023';
  end if;

  select * into v_row from demo_private.funding_authorizations
    where customer_id = auth.uid() and request_key = p_request_key
    order by created_at desc limit 1 for update;
  if found then
    if v_row.amount <> p_amount or v_row.payment_method <> p_payment_method
      or v_row.make_default <> p_make_default or v_row.wallet_account_id <> v_wallet then
      raise exception 'This confirmation belongs to a different deposit.' using errcode = '22023';
    end if;
    if v_row.consumed_by is not null or v_row.expires_at > clock_timestamp() then
      return v_row.id;
    end if;
  end if;

  if (select count(*) from demo_private.funding_authorizations
    where customer_id = auth.uid() and created_at > clock_timestamp() - interval '1 minute') >= 3 then
    raise exception 'Please wait a minute before confirming another deposit.' using errcode = 'P0001';
  end if;
  insert into demo_private.funding_authorizations (
    customer_id, wallet_account_id, request_key, amount, payment_method,
    make_default, policy_version, auth_session_id, authenticated_at, confirmation_method
  ) values (
    auth.uid(), v_wallet, p_request_key, p_amount, p_payment_method,
    p_make_default, p_policy_version, null, clock_timestamp(), 'checkbox'
  ) returning id into v_id;
  return v_id;
end $$;

revoke all on function public.confirm_demo_checkbox_funding(integer,text,text,boolean,text)
  from public, anon, authenticated, service_role;
grant execute on function public.confirm_demo_checkbox_funding(integer,text,text,boolean,text)
  to authenticated;

create or replace function demo_private.require_funding_authorization() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_auth demo_private.funding_authorizations;
begin
  if not (select funding_reauth_required from demo_private.funding_config where singleton) then return new; end if;
  select * into v_auth from demo_private.funding_authorizations
    where customer_id = new.customer_id and request_key = new.idempotency_key
    order by created_at desc limit 1 for update;
  if not found or v_auth.customer_id is distinct from auth.uid()
    or v_auth.wallet_account_id <> new.wallet_account_id
    or v_auth.amount <> new.amount or v_auth.currency <> new.currency
    or v_auth.expires_at <= clock_timestamp() or v_auth.consumed_by is not null then
    raise exception 'Confirm this demo deposit again.' using errcode = 'P0001';
  end if;
  update demo_private.funding_authorizations set consumed_by = new.id where id = v_auth.id;
  return new;
end $$;

notify pgrst, 'reload schema';
commit;
