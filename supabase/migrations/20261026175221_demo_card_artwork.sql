-- Recreated sample artwork: eight palette indices, never photos or card details.
begin;
alter table demo_private.customer_payment_methods add column artwork smallint[];
alter table demo_private.customer_payment_methods add constraint demo_card_artwork_palette check (
  artwork is null or (cardinality(artwork) = 8 and array_ndims(artwork) = 1 and array_length(artwork, 1) = 8
    and array_lower(artwork, 1) = 1 and array_position(artwork, null) is null
    and 0 <= all(artwork) and 11 >= all(artwork))
);

create or replace function public.get_demo_payment_methods() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  perform demo_private.assert_card_environment();
  if not public.is_demo_payment_enabled() then raise exception 'Funding is unavailable' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default,'artwork',artwork)
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
  select jsonb_build_object('token',provider_token,'lastFour',last_four,'isDefault',is_default,'artwork',artwork) into v_result
    from demo_private.customer_payment_methods where customer_id=auth.uid() and removed_at is null
    order by is_default desc,created_at,provider_token limit 1;
  return v_result;
end $$;

-- Retain the existing canonical saver, account checks, wallet lock and preference rules.
-- The wrapper is atomic: a failed artwork validation cannot partially save a card.
create function public.save_demo_card_artwork(p_payment_method text, p_make_default boolean, p_artwork smallint[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_card jsonb;
begin
  perform demo_private.assert_card_environment();
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_artwork is null or array_ndims(p_artwork) is distinct from 1
    or array_length(p_artwork, 1) is distinct from 8 or array_lower(p_artwork, 1) is distinct from 1
    or array_position(p_artwork, null) is not null or not (0 <= all(p_artwork) and 11 >= all(p_artwork)) then
    raise exception 'Only sample palette colors are accepted' using errcode='22023';
  end if;
  v_card := public.save_demo_payment_method(p_payment_method, p_make_default);
  update demo_private.customer_payment_methods set artwork=p_artwork, updated_at=clock_timestamp()
    where customer_id=auth.uid() and provider_token=p_payment_method and removed_at is null;
  return v_card || jsonb_build_object('artwork',p_artwork);
end $$;
revoke all on function public.save_demo_card_artwork(text,boolean,smallint[]) from public,anon,authenticated,service_role;
grant execute on function public.save_demo_card_artwork(text,boolean,smallint[]) to authenticated;
commit;
