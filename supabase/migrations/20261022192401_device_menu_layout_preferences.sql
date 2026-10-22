-- Existing menu_layout remains the mobile choice. Wider screens retain their
-- current Classic header until the customer explicitly saves a choice there.
alter table public.customer_profiles
  add column tablet_menu_layout text not null default 'classic'
    constraint customer_profiles_tablet_menu_layout_check check (tablet_menu_layout in ('classic', 'ending-search', 'home-ending-search', 'search-down', 'search-down-browse', 'search-over')),
  add column desktop_menu_layout text not null default 'classic'
    constraint customer_profiles_desktop_menu_layout_check check (desktop_menu_layout in ('classic', 'ending-search', 'home-ending-search', 'search-down', 'search-down-browse', 'search-over'));

create function preferences_private.set_device_menu_layout(p_layout text, p_device text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_device is null or p_device not in ('mobile', 'tablet', 'desktop') then
    raise exception 'Choose a valid menu device' using errcode = '22023';
  end if;
  if p_layout is null or p_layout not in ('classic', 'ending-search', 'home-ending-search', 'search-down', 'search-down-browse', 'search-over') then
    raise exception 'Choose a valid menu layout' using errcode = '22023';
  end if;
  if not exists (select 1 from public.customer_profiles where customer_id = caller) then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  if p_device = 'mobile' then
    update public.customer_profiles set menu_layout = p_layout where customer_id = caller and menu_layout is distinct from p_layout;
  elsif p_device = 'tablet' then
    update public.customer_profiles set tablet_menu_layout = p_layout where customer_id = caller and tablet_menu_layout is distinct from p_layout;
  else
    update public.customer_profiles set desktop_menu_layout = p_layout where customer_id = caller and desktop_menu_layout is distinct from p_layout;
  end if;
end;
$$;
revoke all on function preferences_private.set_device_menu_layout(text, text) from public, anon, authenticated, service_role;
grant execute on function preferences_private.set_device_menu_layout(text, text) to authenticated;

create function public.set_device_menu_layout(p_layout text, p_device text)
returns void language sql security invoker set search_path = '' as $$
  select preferences_private.set_device_menu_layout(p_layout, p_device);
$$;
revoke all on function public.set_device_menu_layout(text, text) from public, anon, authenticated, service_role;
grant execute on function public.set_device_menu_layout(text, text) to authenticated;

notify pgrst, 'reload schema';
