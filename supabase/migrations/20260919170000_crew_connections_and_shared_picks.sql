-- Crew sharing is opt-in, separate from immutable entry and wallet history.
begin;

create table public.crew_invitations (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.customers(id) on delete cascade,
  recipient_id uuid not null references public.customers(id) on delete cascade,
  requester_name text not null,
  recipient_name text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'removed')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);
create unique index crew_one_active_connection_per_pair
  on public.crew_invitations (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
  where status in ('pending', 'accepted');
create index crew_invitations_recipient_pending on public.crew_invitations(recipient_id, created_at desc) where status = 'pending';
alter table public.crew_invitations enable row level security;
revoke all on public.crew_invitations from public, anon, authenticated, service_role;
grant select on public.crew_invitations to authenticated;
create policy "Crew participants see their invitations" on public.crew_invitations
  for select to authenticated using (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()));

create unique index customer_entries_id_owner_for_crew on public.customer_entries(id, customer_id);
create table public.crew_entry_shares (
  entry_id uuid primary key references public.customer_entries(id) on delete cascade,
  owner_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  foreign key (entry_id, owner_id) references public.customer_entries(id, customer_id) on delete cascade
);
-- The composite owner FK prevents sharing an entry belonging to someone else.
alter table public.crew_entry_shares enable row level security;
revoke all on public.crew_entry_shares from public, anon, authenticated, service_role;
grant select, insert, delete on public.crew_entry_shares to authenticated;
create policy "Owners and accepted Crew can see shared entry flags" on public.crew_entry_shares
  for select to authenticated using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.crew_invitations c
      where c.status = 'accepted'
      and ((c.requester_id = owner_id and c.recipient_id = (select auth.uid()))
        or (c.recipient_id = owner_id and c.requester_id = (select auth.uid())))
    )
  );
create policy "Owners can share their entries" on public.crew_entry_shares
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners can stop sharing their entries" on public.crew_entry_shares
  for delete to authenticated using (owner_id = (select auth.uid()));

create or replace function public.request_crew_invitation(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_requester uuid := auth.uid();
  v_recipient uuid;
  v_requester_name text;
  v_recipient_name text;
begin
  if v_requester is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_email is null or length(trim(p_email)) not between 3 and 254 or position('@' in p_email) = 0 then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  if (select count(*) from public.crew_invitations
      where requester_id = v_requester and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Crew invitation limit reached for today' using errcode = 'P0001';
  end if;
  select u.id into v_recipient from auth.users u
    join public.customers c on c.id = u.id
    where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null;
  -- Do not disclose whether an email address belongs to an account.
  if v_recipient is null or v_recipient = v_requester then return 'accepted_for_delivery'; end if;
  if exists (select 1 from public.crew_invitations c
    where c.status in ('pending', 'accepted')
    and ((c.requester_id = v_requester and c.recipient_id = v_recipient)
      or (c.requester_id = v_recipient and c.recipient_id = v_requester))) then
    return 'accepted_for_delivery';
  end if;
  select coalesce(nullif(trim(p.display_name), ''), trim(p.legal_first_name), 'A member')
    into v_requester_name from public.customer_profiles p where p.customer_id = v_requester;
  select coalesce(nullif(trim(p.display_name), ''), trim(p.legal_first_name), 'A member')
    into v_recipient_name from public.customer_profiles p where p.customer_id = v_recipient;
  insert into public.crew_invitations(requester_id, recipient_id, requester_name, recipient_name)
    values (v_requester, v_recipient, coalesce(v_requester_name, 'A member'), coalesce(v_recipient_name, 'A member'));
  return 'accepted_for_delivery';
end;
$$;
revoke all on function public.request_crew_invitation(text) from public, anon, authenticated, service_role;
grant execute on function public.request_crew_invitation(text) to authenticated;

create or replace function public.respond_crew_invitation(p_invitation_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.crew_invitations set status = case when p_accept then 'accepted' else 'declined' end,
    responded_at = now()
    where id = p_invitation_id and recipient_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Crew request is no longer pending' using errcode = '22023'; end if;
end;
$$;
revoke all on function public.respond_crew_invitation(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.respond_crew_invitation(uuid,boolean) to authenticated;

create or replace function public.remove_crew_connection(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.crew_invitations set status = 'removed', responded_at = now()
    where id = p_invitation_id and status in ('pending', 'accepted')
    and (requester_id = auth.uid() or recipient_id = auth.uid());
  if not found then raise exception 'Crew connection is no longer active' using errcode = '22023'; end if;
end;
$$;
revoke all on function public.remove_crew_connection(uuid) from public, anon, authenticated, service_role;
grant execute on function public.remove_crew_connection(uuid) to authenticated;

create or replace function public.create_preview_entries_with_sharing(
  p_offering_slug text, p_quantity integer, p_idempotency_key text, p_share_with_crew boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  v_result := public.create_preview_entries(p_offering_slug, p_quantity, p_idempotency_key);
  if coalesce(p_share_with_crew, false) and not coalesce((v_result->>'duplicate')::boolean, false) then
    insert into public.crew_entry_shares(entry_id, owner_id)
      select e.id, auth.uid() from public.customer_entries e
      join public.preview_entry_batches b on b.id = e.preview_batch_id
      where b.batch_id = v_result->>'batchId' and b.customer_id = auth.uid();
  end if;
  return v_result;
end;
$$;
revoke all on function public.create_preview_entries_with_sharing(text,integer,text,boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.create_preview_entries_with_sharing(text,integer,text,boolean) to authenticated;

create or replace function public.get_crew_shared_picks(p_member_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_picks jsonb;
begin
  if auth.uid() is null or p_member_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_member_id <> auth.uid() and not exists (
    select 1 from public.crew_invitations c where c.status = 'accepted'
    and ((c.requester_id = auth.uid() and c.recipient_id = p_member_id)
      or (c.recipient_id = auth.uid() and c.requester_id = p_member_id))
  ) then raise exception 'Crew connection required' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'title', o.title, 'retailer', o.retailer, 'image', o.image_path,
    'offeringSlug', o.slug, 'sharedAt', s.created_at
  ) order by s.created_at desc), '[]'::jsonb) into v_picks
  from (select distinct on (e.offering_slug) e.offering_slug, s.created_at
    from public.crew_entry_shares s join public.customer_entries e on e.id = s.entry_id
    where s.owner_id = p_member_id order by e.offering_slug, s.created_at desc
  ) s join demo_private.preview_entry_offerings o on o.slug = s.offering_slug;
  return v_picks;
end;
$$;
revoke all on function public.get_crew_shared_picks(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_crew_shared_picks(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
