begin;

create function public.reset_reviewed_demo_activity(
  p_expected_entry_count integer, p_expected_balance_cents bigint, p_request_key text,
  p_entry_revision text, p_transaction_revision text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_wallet uuid;
begin
  if p_entry_revision is null or p_entry_revision !~ '^[0-9a-f]{64}$'
    or p_transaction_revision is null or p_transaction_revision !~ '^[0-9a-f]{64}$' then
    raise exception 'Review your current demo activity before resetting it.' using errcode = '22023';
  end if;
  perform demo_private.assert_card_environment();
  v_wallet := demo_private.lock_funding_wallet();
  if not exists (select 1 from demo_private.all_activity_reset_requests
    where customer_id = auth.uid() and wallet_account_id = v_wallet and request_key = p_request_key)
    and (public.get_demo_entry_reset_preview()->>'revision' is distinct from p_entry_revision
      or public.get_demo_transaction_clear_preview()->>'revision' is distinct from p_transaction_revision) then
    raise exception 'Demo activity changed. Open a fresh review before resetting.' using errcode = 'PT409';
  end if;
  return public.reset_all_demo_activity(p_expected_entry_count, p_expected_balance_cents, p_request_key);
end;
$$;
revoke all on function public.reset_reviewed_demo_activity(integer,bigint,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.reset_reviewed_demo_activity(integer,bigint,text,text,text) to authenticated;

create or replace function public.get_demo_payment_methods() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  perform demo_private.assert_card_environment();
  if not public.is_demo_payment_enabled() then raise exception 'Funding is unavailable' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('token',provider_token,'lastFour',last_four,
    'isDefault',is_default,'isDepositDefault',is_deposit_default,'artwork',artwork,'revision',updated_at)
    order by is_default desc,created_at,provider_token),'[]'::jsonb) into v_result
    from demo_private.customer_payment_methods where customer_id = auth.uid() and removed_at is null;
  return v_result;
end;
$$;

create function public.delete_reviewed_demo_payment_method(p_payment_method text, p_revision timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform demo_private.assert_card_environment();
  perform demo_private.lock_funding_wallet();
  if p_revision is null or not exists (select 1 from demo_private.customer_payment_methods
    where customer_id = auth.uid() and provider_token = p_payment_method and removed_at is null and updated_at = p_revision) then
    raise exception 'This saved card changed. Review the current card before removing it.' using errcode = 'PT409';
  end if;
  return public.delete_demo_payment_method(p_payment_method);
end;
$$;
revoke all on function public.delete_reviewed_demo_payment_method(text,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.delete_reviewed_demo_payment_method(text,timestamptz) to authenticated;

create function public.update_reviewed_demo_card(
  p_payment_method text, p_revision timestamptz, p_make_default boolean,
  p_make_deposit_default boolean, p_artwork smallint[] default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_card demo_private.customer_payment_methods;
begin
  perform demo_private.assert_card_environment();
  perform demo_private.lock_funding_wallet();
  select * into v_card from demo_private.customer_payment_methods
    where customer_id = auth.uid() and provider_token = p_payment_method and removed_at is null;
  if not found or p_revision is null or v_card.updated_at is distinct from p_revision then
    raise exception 'This saved card changed. Review your current card preferences and save again.' using errcode = 'PT409';
  end if;
  perform public.save_demo_card_preferences(p_payment_method, coalesce(p_make_default,v_card.is_default),
    coalesce(p_make_deposit_default,v_card.is_deposit_default), p_artwork);
  return (select card from jsonb_array_elements(public.get_demo_payment_methods()) as rows(card)
    where card->>'token' = p_payment_method);
end;
$$;
revoke all on function public.update_reviewed_demo_card(text,timestamptz,boolean,boolean,smallint[]) from public, anon, authenticated, service_role;
grant execute on function public.update_reviewed_demo_card(text,timestamptz,boolean,boolean,smallint[]) to authenticated;

notify pgrst, 'reload schema';
commit;
