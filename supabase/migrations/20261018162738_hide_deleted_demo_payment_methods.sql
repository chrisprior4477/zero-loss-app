-- A saved demo card may already be referenced by immutable deposit history.
-- Hide it from future use without deleting its historical payment snapshot.
begin;

alter table demo_private.customer_payment_methods
  add column removed_at timestamptz;

create or replace function public.get_demo_payment_methods() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  perform demo_private.assert_card_environment();
  if not public.is_demo_payment_enabled() then raise exception 'Funding is unavailable' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default)
    order by is_default desc,created_at,provider_token),'[]'::jsonb) into v_result
    from demo_private.customer_payment_methods where customer_id=auth.uid() and removed_at is null;
  return v_result;
end $$;

create or replace function public.get_demo_payment_method() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  perform demo_private.assert_card_environment();
  if not public.is_demo_payment_enabled() then raise exception 'Funding is unavailable' using errcode='42501'; end if;
  select jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default) into v_result
    from demo_private.customer_payment_methods where customer_id=auth.uid() and removed_at is null
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
    on conflict(customer_id,provider_token) do update
      set is_default=excluded.is_default,removed_at=null,updated_at=clock_timestamp();
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
    on conflict(customer_id,provider_token) do update
      set is_default=excluded.is_default,removed_at=null,updated_at=clock_timestamp();
  insert into demo_private.funding_payment_methods(session_id,customer_id,provider_token,make_default)
    values(v_session.id,auth.uid(),p_payment_method,p_make_default);
  return v_session;
end $$;

create function public.delete_demo_payment_method(p_payment_method text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; v_removed boolean;
begin
  perform demo_private.assert_card_environment();
  if p_payment_method not in ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002') then
    raise exception 'Only supplied test cards are supported' using errcode='22023';
  end if;
  v_wallet:=demo_private.lock_funding_wallet();
  update demo_private.customer_payment_methods
    set is_default=false,removed_at=clock_timestamp(),updated_at=clock_timestamp()
    where customer_id=auth.uid() and provider_token=p_payment_method and removed_at is null;
  v_removed:=found;
  return v_removed;
end $$;

revoke all on function public.delete_demo_payment_method(text) from public,anon,authenticated,service_role;
grant execute on function public.delete_demo_payment_method(text) to authenticated;

commit;
