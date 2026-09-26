-- A shareable Crew link lets a signed-in recipient request a connection.
-- The owner still approves the request, and no picks become shared by default.
begin;

create table public.crew_invite_links (
  owner_id uuid primary key references public.customers(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.crew_invite_links enable row level security;
revoke all on public.crew_invite_links from public, anon, authenticated, service_role;

create or replace function public.get_or_create_crew_invite_link()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_token uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.crew_invite_links(owner_id)
    select c.id from public.customers c where c.id = auth.uid() and c.status = 'active'
    on conflict (owner_id) do nothing;
  select l.token into v_token from public.crew_invite_links l where l.owner_id = auth.uid();
  if v_token is null then raise exception 'Crew link unavailable' using errcode = '22023'; end if;
  return v_token;
end;
$$;
revoke all on function public.get_or_create_crew_invite_link() from public, anon, authenticated, service_role;
grant execute on function public.get_or_create_crew_invite_link() to authenticated;

create or replace function public.request_crew_invitation_from_link(p_token uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_requester uuid := auth.uid();
  v_owner uuid;
  v_requester_name text;
  v_owner_name text;
begin
  if v_requester is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select l.owner_id into v_owner from public.crew_invite_links l
    join public.customers c on c.id = l.owner_id and c.status = 'active'
    where l.token = p_token;
  if v_owner is null then return 'invalid'; end if;
  if v_owner = v_requester then return 'self'; end if;
  if not exists (select 1 from public.customers c where c.id = v_requester and c.status = 'active') then return 'unavailable'; end if;
  if (select count(*) from public.crew_invitations
      where requester_id = v_requester and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Crew invitation limit reached for today' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.crew_invitations i
      where i.status in ('pending', 'accepted')
      and ((i.requester_id = v_requester and i.recipient_id = v_owner)
        or (i.requester_id = v_owner and i.recipient_id = v_requester))) then
    return 'already_requested';
  end if;
  select coalesce(nullif(trim(p.display_name), ''), trim(p.legal_first_name), 'A member')
    into v_requester_name from public.customer_profiles p where p.customer_id = v_requester;
  select coalesce(nullif(trim(p.display_name), ''), trim(p.legal_first_name), 'A member')
    into v_owner_name from public.customer_profiles p where p.customer_id = v_owner;
  insert into public.crew_invitations(requester_id, recipient_id, requester_name, recipient_name)
    values (v_requester, v_owner, coalesce(v_requester_name, 'A member'), coalesce(v_owner_name, 'A member'))
    on conflict do nothing;
  return 'request_sent';
end;
$$;
revoke all on function public.request_crew_invitation_from_link(uuid) from public, anon, authenticated, service_role;
grant execute on function public.request_crew_invitation_from_link(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
