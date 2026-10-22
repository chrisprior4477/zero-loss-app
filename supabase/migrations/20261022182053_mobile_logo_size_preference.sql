-- Mobile-only presentation preference, independent of menu_layout.
alter table public.customer_profiles
  add column mobile_logo_size smallint not null default 0
  constraint customer_profiles_mobile_logo_size_check
  check (mobile_logo_size in (0, 5, 10, 15, 20, 25, 30, 35));

create schema if not exists preferences_private;
revoke all on schema preferences_private from public, anon;
grant usage on schema preferences_private to authenticated;

-- Privileged writes stay outside the exposed API schema. No direct table
-- grants are added, and the caller cannot supply a different customer's ID.
create function preferences_private.set_mobile_logo_size(p_size integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_size is null or p_size not in (0, 5, 10, 15, 20, 25, 30, 35) then
    raise exception 'Choose a valid mobile logo size' using errcode = '22023';
  end if;
  update public.customer_profiles
     set mobile_logo_size = p_size
   where customer_id = caller and mobile_logo_size is distinct from p_size;
  if not found and not exists (select 1 from public.customer_profiles where customer_id = caller) then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function preferences_private.set_mobile_logo_size(integer) from public, anon, authenticated, service_role;
grant execute on function preferences_private.set_mobile_logo_size(integer) to authenticated;

create function public.set_mobile_logo_size(p_size integer)
returns void language sql security invoker set search_path = '' as $$
  select preferences_private.set_mobile_logo_size(p_size);
$$;
revoke all on function public.set_mobile_logo_size(integer) from public, anon, authenticated, service_role;
grant execute on function public.set_mobile_logo_size(integer) to authenticated;

notify pgrst, 'reload schema';
