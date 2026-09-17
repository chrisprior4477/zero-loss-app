-- Save the fixed preview payment token without creating a funding request.
begin;

create function public.save_demo_payment_method(p_payment_method text, p_make_default boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid;
begin
  perform demo_private.assert_card_environment();
  if p_payment_method is distinct from 'demo_card_4242' or p_make_default is null then
    raise exception 'Only the supplied test card is supported' using errcode = '22023';
  end if;
  -- Reuse the same account, confirmation, permission and wallet lock as funding.
  v_wallet := demo_private.lock_funding_wallet();
  insert into demo_private.customer_payment_methods(customer_id,is_default)
    values(auth.uid(),p_make_default)
    on conflict(customer_id) do update set is_default=excluded.is_default,updated_at=clock_timestamp();
  return jsonb_build_object('token','demo_card_4242','lastFour','4242','isDefault',p_make_default);
end $$;

revoke all on function public.save_demo_payment_method(text,boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.save_demo_payment_method(text,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
