-- Presentation preference only; existing customers retain Classic.
alter table public.customer_profiles
  add column menu_layout text not null default 'classic'
  constraint customer_profiles_menu_layout_check check (
    menu_layout in ('classic', 'ending-search', 'home-ending-search', 'search-down', 'search-over')
  );

-- Profile writes already use owner-scoped RPCs; do not reopen direct table writes.
create or replace function public.set_menu_layout(p_layout text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_layout is null or p_layout not in ('classic', 'ending-search', 'home-ending-search', 'search-down', 'search-over') then
    raise exception 'Choose a valid menu layout' using errcode = '22023';
  end if;
  update public.customer_profiles set menu_layout = p_layout where customer_id = auth.uid();
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.set_menu_layout(text) from public, anon, authenticated, service_role;
grant execute on function public.set_menu_layout(text) to authenticated;
notify pgrst, 'reload schema';
