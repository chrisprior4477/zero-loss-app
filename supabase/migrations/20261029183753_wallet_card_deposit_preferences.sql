-- Independent, owner-scoped saved-card preferences. No ledger or deposit writes.
begin;
alter table demo_private.customer_payment_methods add column is_deposit_default boolean not null default false;
update demo_private.customer_payment_methods set is_deposit_default=true where is_default and removed_at is null;
create unique index customer_one_deposit_default_card on demo_private.customer_payment_methods(customer_id) where is_deposit_default;

-- Add the fifth illustrative bank fixture; existing card identities remain intact.
alter table demo_private.customer_payment_methods drop constraint customer_payment_methods_fixture_check;
alter table demo_private.customer_payment_methods add constraint customer_payment_methods_fixture_check check (
  (provider_token,last_four) in (('demo_card_4242','4242'),('demo_card_5556','5556'),('demo_card_1881','1881'),('demo_card_0002','0002'),('demo_card_1117','1117')));
alter table demo_private.funding_payment_methods drop constraint funding_payment_methods_fixture_check;
alter table demo_private.funding_payment_methods add constraint funding_payment_methods_fixture_check check (
  provider_token in ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002','demo_card_1117'));
alter table demo_private.funding_authorizations drop constraint funding_authorizations_fixture_check;
alter table demo_private.funding_authorizations add constraint funding_authorizations_fixture_check check (
  payment_method in ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002','demo_card_1117'));

-- Preserve installed integer/bigint signatures and all confirmation/retry rules.
-- Only extend the fixed fixture whitelist, never replace a financial implementation
-- with an older migration's body (which could restore retired deposit limits).
do $$
declare f record; definition text;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('create_demo_card_funding_session','authorize_demo_funding','confirm_demo_checkbox_funding')
  loop
    definition := pg_get_functiondef(f.oid);
    definition := replace(definition, '''demo_card_0002'')', '''demo_card_0002'',''demo_card_1117'')');
    definition := replace(definition, 'when ''demo_card_0002'' then ''0002''', 'when ''demo_card_0002'' then ''0002'' when ''demo_card_1117'' then ''1117''');
    execute definition;
  end loop;
end $$;

create or replace function public.get_demo_payment_methods() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  perform demo_private.assert_card_environment();
  if not public.is_demo_payment_enabled() then raise exception 'Funding is unavailable' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default,'isDepositDefault',is_deposit_default,'artwork',artwork)
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
  select jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default,'isDepositDefault',is_deposit_default,'artwork',artwork) into v_result
    from demo_private.customer_payment_methods where customer_id=auth.uid() and removed_at is null
    order by is_default desc,created_at,provider_token limit 1;
  return v_result;
end $$;

create or replace function public.save_demo_payment_method(p_payment_method text,p_make_default boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; v_last_four text; v_result jsonb;
begin
  perform demo_private.assert_card_environment();
  v_last_four:=case p_payment_method when 'demo_card_4242' then '4242' when 'demo_card_5556' then '5556'
    when 'demo_card_1881' then '1881' when 'demo_card_0002' then '0002' when 'demo_card_1117' then '1117' end;
  if v_last_four is null or p_make_default is null then raise exception 'Only supplied test cards are supported' using errcode='22023'; end if;
  v_wallet:=demo_private.lock_funding_wallet();
  if p_make_default then update demo_private.customer_payment_methods set is_default=false,updated_at=clock_timestamp()
    where customer_id=auth.uid() and is_default; end if;
  insert into demo_private.customer_payment_methods(customer_id,provider_token,last_four,is_default)
    values(auth.uid(),p_payment_method,v_last_four,p_make_default)
    on conflict(customer_id,provider_token) do update
      set is_default=excluded.is_default,removed_at=null,updated_at=clock_timestamp();
  select jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default,'isDepositDefault',is_deposit_default,'artwork',artwork)
    into v_result from demo_private.customer_payment_methods where customer_id=auth.uid() and provider_token=p_payment_method;
  return v_result;
end $$;

create function public.save_demo_card_preferences(p_payment_method text,p_make_default boolean,p_make_deposit_default boolean,p_artwork smallint[] default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_card jsonb;
begin
  perform demo_private.assert_card_environment();
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_make_deposit_default is null then raise exception 'Choose a deposit preference' using errcode='22023'; end if;
  -- The existing saver checks eligibility and locks this owner's wallet. This
  -- serializes both preferences and any concurrent card removal/funding request.
  if p_artwork is null then v_card:=public.save_demo_payment_method(p_payment_method,p_make_default);
  else v_card:=public.save_demo_card_artwork(p_payment_method,p_make_default,p_artwork); end if;
  if p_make_deposit_default then
    update demo_private.customer_payment_methods set is_deposit_default=false,updated_at=clock_timestamp()
      where customer_id=auth.uid() and is_deposit_default;
  end if;
  update demo_private.customer_payment_methods set is_deposit_default=p_make_deposit_default,updated_at=clock_timestamp()
    where customer_id=auth.uid() and provider_token=p_payment_method and removed_at is null;
  return v_card || jsonb_build_object('isDepositDefault',p_make_deposit_default);
end $$;
revoke all on function public.save_demo_card_preferences(text,boolean,boolean,smallint[]) from public,anon,authenticated,service_role;
grant execute on function public.save_demo_card_preferences(text,boolean,boolean,smallint[]) to authenticated;

create or replace function public.delete_demo_payment_method(p_payment_method text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; v_removed boolean;
begin
  perform demo_private.assert_card_environment();
  if p_payment_method is null or p_payment_method not in ('demo_card_4242','demo_card_5556','demo_card_1881','demo_card_0002','demo_card_1117') then
    raise exception 'Only supplied test cards are supported' using errcode='22023'; end if;
  v_wallet:=demo_private.lock_funding_wallet();
  update demo_private.customer_payment_methods set is_default=false,is_deposit_default=false,removed_at=clock_timestamp(),updated_at=clock_timestamp()
    where customer_id=auth.uid() and provider_token=p_payment_method and removed_at is null;
  v_removed:=found;
  return v_removed;
end $$;
commit;
