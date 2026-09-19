-- Real Crew discovery: names are searchable only when the member opts in.
-- Exact email and verified-phone invitations require the recipient's approval.
begin;

alter table public.customer_profiles
  add column crew_discoverable boolean not null default false;

create table public.crew_name_search_events (
  id bigint generated always as identity primary key,
  searcher_id uuid not null references public.customers(id) on delete cascade,
  searched_at timestamptz not null default now()
);
create index crew_name_search_events_limit on public.crew_name_search_events(searcher_id, searched_at desc);
alter table public.crew_name_search_events enable row level security;
revoke all on public.crew_name_search_events from public, anon, authenticated, service_role;

create or replace function public.set_crew_discoverable(p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_enabled is null then
    raise exception 'A signed-in member and choice are required' using errcode = '22023';
  end if;
  update public.customer_profiles set crew_discoverable = p_enabled where customer_id = auth.uid();
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.set_crew_discoverable(boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_crew_discoverable(boolean) to authenticated;

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
    p.avatar_reference
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
    p.avatar_reference
  from public.crew_invitations i
  join public.customer_profiles p on p.customer_id = case
    when i.requester_id = auth.uid() then i.recipient_id else i.requester_id end
  where i.status = 'accepted' and (i.requester_id = auth.uid() or i.recipient_id = auth.uid())
  order by i.created_at desc;
end;
$$;
revoke all on function public.get_crew_member_profiles() from public, anon, authenticated, service_role;
grant execute on function public.get_crew_member_profiles() to authenticated;

create or replace function public.request_crew_invitation_by_id(p_member_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select u.email into v_email from public.customer_profiles p
    join auth.users u on u.id = p.customer_id and u.email_confirmed_at is not null
    where p.customer_id = p_member_id and p.crew_discoverable;
  if v_email is null then return 'accepted_for_delivery'; end if;
  return public.request_crew_invitation(v_email);
end;
$$;
revoke all on function public.request_crew_invitation_by_id(uuid) from public, anon, authenticated, service_role;
grant execute on function public.request_crew_invitation_by_id(uuid) to authenticated;

create or replace function public.request_crew_invitation_by_phone(p_phone text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'); v_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(v_digits) not between 10 and 15 then
    raise exception 'Enter a valid phone number with country code' using errcode = '22023';
  end if;
  select u.email into v_email from auth.users u
    join public.customers c on c.id = u.id and c.status = 'active'
    where u.phone_confirmed_at is not null
      and regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = v_digits;
  if v_email is null then return 'accepted_for_delivery'; end if;
  return public.request_crew_invitation(v_email);
end;
$$;
revoke all on function public.request_crew_invitation_by_phone(text) from public, anon, authenticated, service_role;
grant execute on function public.request_crew_invitation_by_phone(text) to authenticated;

notify pgrst, 'reload schema';
commit;
