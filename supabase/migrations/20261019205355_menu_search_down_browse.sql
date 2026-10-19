-- Expand the existing presentation preference; preserve every saved choice.
begin;
alter table public.customer_profiles drop constraint customer_profiles_menu_layout_check;
alter table public.customer_profiles add constraint customer_profiles_menu_layout_check
  check (menu_layout in ('classic', 'ending-search', 'home-ending-search', 'search-down', 'search-down-browse', 'search-over'));

-- Retain the existing owner-scoped RPC and its permissions.
create or replace function public.set_menu_layout(p_layout text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_layout is null or p_layout not in ('classic', 'ending-search', 'home-ending-search', 'search-down', 'search-down-browse', 'search-over') then
    raise exception 'Choose a valid menu layout' using errcode = '22023';
  end if;
  update public.customer_profiles set menu_layout = p_layout where customer_id = auth.uid();
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
