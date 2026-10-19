-- Keep the saved photo while letting its owner choose where it is displayed.

alter table public.customer_profiles
  add column show_photo_in_menu boolean not null default true,
  add column show_photo_to_crew boolean not null default true;

create or replace function public.set_profile_photo_visibility(p_surface text, p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_surface not in ('menu', 'crew') or p_enabled is null then
    raise exception 'Choose a valid photo location and setting' using errcode = '22023';
  end if;

  update public.customer_profiles as p set
    show_photo_in_menu = case when p_surface = 'menu' then p_enabled else p.show_photo_in_menu end,
    show_photo_to_crew = case when p_surface = 'crew' then p_enabled else p.show_photo_to_crew end
  where p.customer_id = auth.uid();
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.set_profile_photo_visibility(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_profile_photo_visibility(text, boolean) to authenticated;

-- Search results only receive a photo after both people have approved a Crew connection.
create or replace function public.search_crew_people(p_name text)
returns table(member_id uuid, name text, avatar_reference text)
language plpgsql security definer set search_path = '' as $$
declare v_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(v_name) not between 3 and 60 then
    raise exception 'Use 3 to 60 characters for name search' using errcode = '22023';
  end if;
  if (select count(*) from public.crew_name_search_events e
      where e.searcher_id = auth.uid() and e.searched_at > now() - interval '1 hour') >= 30 then
    raise exception 'Crew search limit reached' using errcode = 'P0001';
  end if;
  insert into public.crew_name_search_events(searcher_id) values (auth.uid());

  return query
  select p.customer_id,
    coalesce(nullif(btrim(p.display_name), ''), p.legal_first_name || ' ' || left(p.legal_last_name, 1) || '.') as name,
    case when p.show_photo_to_crew and exists (
      select 1 from public.crew_invitations i
      where i.status = 'accepted' and (
        (i.requester_id = auth.uid() and i.recipient_id = p.customer_id) or
        (i.recipient_id = auth.uid() and i.requester_id = p.customer_id)
      )
    ) then p.avatar_reference else null end
  from public.customer_profiles p
  join public.customers c on c.id = p.customer_id and c.status = 'active'
  join auth.users u on u.id = p.customer_id and u.email_confirmed_at is not null
  where p.crew_discoverable and p.customer_id <> auth.uid()
    and left(lower(coalesce(nullif(btrim(p.display_name), ''), p.legal_first_name)), length(v_name)) = lower(v_name)
  order by lower(coalesce(nullif(btrim(p.display_name), ''), p.legal_first_name)), p.customer_id
  limit 8;
end;
$$;
revoke all on function public.search_crew_people(text) from public, anon, authenticated, service_role;
grant execute on function public.search_crew_people(text) to authenticated;

create or replace function public.get_crew_member_profiles()
returns table(member_id uuid, name text, avatar_reference text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return query
  select p.customer_id,
    coalesce(nullif(btrim(p.display_name), ''), p.legal_first_name || ' ' || left(p.legal_last_name, 1) || '.'),
    case when p.show_photo_to_crew then p.avatar_reference else null end
  from public.crew_invitations i
  join public.customer_profiles p on p.customer_id = case
    when i.requester_id = auth.uid() then i.recipient_id else i.requester_id end
  where i.status = 'accepted' and (i.requester_id = auth.uid() or i.recipient_id = auth.uid())
  order by i.created_at desc;
end;
$$;
revoke all on function public.get_crew_member_profiles() from public, anon, authenticated, service_role;
grant execute on function public.get_crew_member_profiles() to authenticated;

notify pgrst, 'reload schema';
