-- Account-owned Crew audiences. Existing shared picks keep their all-approved-Crew audience.
begin;

create table public.crew_visibility_settings (
  owner_id uuid primary key references public.customers(id) on delete cascade,
  default_rule jsonb not null default '{"audience":"everyone","memberIds":[],"groupIds":[]}'::jsonb,
  groups jsonb not null default '[]'::jsonb,
  entry_rules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(default_rule) = 'object'),
  check (jsonb_typeof(groups) = 'array'),
  check (jsonb_typeof(entry_rules) = 'object')
);
alter table public.crew_visibility_settings enable row level security;
revoke all on public.crew_visibility_settings from public, anon, authenticated, service_role;
grant select on public.crew_visibility_settings to authenticated;
create policy "Members see only their Crew visibility settings"
  on public.crew_visibility_settings for select to authenticated
  using (owner_id = (select auth.uid()));

create function public.crew_can_view_shared_entry(p_owner_id uuid, p_entry_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_viewer uuid := auth.uid();
  v_settings public.crew_visibility_settings%rowtype;
  v_rule jsonb;
  v_group jsonb;
begin
  if v_viewer is null or p_owner_id is null or p_entry_id is null then return false; end if;
  if v_viewer = p_owner_id then return true; end if;
  if not exists (
    select 1 from public.crew_invitations c where c.status = 'accepted'
      and ((c.requester_id = p_owner_id and c.recipient_id = v_viewer)
        or (c.recipient_id = p_owner_id and c.requester_id = v_viewer))
  ) then return false; end if;

  select * into v_settings from public.crew_visibility_settings where owner_id = p_owner_id;
  v_rule := coalesce(v_settings.entry_rules -> p_entry_id::text, v_settings.default_rule,
    '{"audience":"everyone"}'::jsonb);
  if v_rule->>'audience' = 'everyone' then return true; end if;
  if v_rule->>'audience' = 'people' then
    return coalesce(v_rule->'memberIds', '[]'::jsonb) ? v_viewer::text;
  end if;
  if v_rule->>'audience' = 'groups' then
    for v_group in select value from jsonb_array_elements(coalesce(v_settings.groups, '[]'::jsonb)) loop
      if coalesce(v_rule->'groupIds', '[]'::jsonb) ? (v_group->>'id')
        and coalesce(v_group->'memberIds', '[]'::jsonb) ? v_viewer::text then
        return true;
      end if;
    end loop;
  end if;
  return false;
end;
$$;
revoke all on function public.crew_can_view_shared_entry(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.crew_can_view_shared_entry(uuid,uuid) to authenticated;

create function demo_private.validate_crew_visibility_rule(p_rule jsonb, p_group_ids uuid[])
returns uuid[] language plpgsql stable set search_path = '' as $$
declare
  v_id_text text;
  v_id uuid;
  v_members uuid[] := '{}';
begin
  if p_rule is null or jsonb_typeof(p_rule) <> 'object'
    or p_rule->>'audience' is null or p_rule->>'audience' not in ('everyone', 'people', 'groups')
    or jsonb_typeof(p_rule->'memberIds') <> 'array'
    or jsonb_typeof(p_rule->'groupIds') <> 'array'
    or jsonb_array_length(p_rule->'memberIds') > 100
    or jsonb_array_length(p_rule->'groupIds') > 20 then
    raise exception 'Invalid Crew audience' using errcode = '22023';
  end if;
  for v_id_text in select value from jsonb_array_elements_text(p_rule->'memberIds') loop
    v_id := v_id_text::uuid;
    if v_id = any(v_members) then raise exception 'Duplicate Crew member' using errcode = '22023'; end if;
    v_members := array_append(v_members, v_id);
  end loop;
  for v_id_text in select value from jsonb_array_elements_text(p_rule->'groupIds') loop
    v_id := v_id_text::uuid;
    if not v_id = any(p_group_ids) then raise exception 'Unknown Crew group' using errcode = '22023'; end if;
  end loop;
  return v_members;
end;
$$;
revoke all on function demo_private.validate_crew_visibility_rule(jsonb,uuid[]) from public, anon, authenticated, service_role;

create function public.save_crew_visibility_settings(
  p_default_rule jsonb, p_groups jsonb, p_entry_rules jsonb, p_discoverable boolean
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_group jsonb;
  v_group_id uuid;
  v_group_ids uuid[] := '{}';
  v_group_names text[] := '{}';
  v_member_text text;
  v_member uuid;
  v_members uuid[] := '{}';
  v_entry_text text;
  v_entry uuid;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_discoverable is null or jsonb_typeof(p_groups) <> 'array'
    or jsonb_typeof(p_entry_rules) <> 'object'
    or jsonb_array_length(p_groups) > 20
    or (select count(*) from jsonb_object_keys(p_entry_rules)) > 500 then
    raise exception 'Invalid Crew settings' using errcode = '22023';
  end if;

  for v_group in select value from jsonb_array_elements(p_groups) loop
    if jsonb_typeof(v_group) <> 'object' or jsonb_typeof(v_group->'memberIds') <> 'array'
      or jsonb_array_length(v_group->'memberIds') > 100
      or length(btrim(coalesce(v_group->>'name', ''))) not between 1 and 50 then
      raise exception 'Invalid Crew group' using errcode = '22023';
    end if;
    v_group_id := (v_group->>'id')::uuid;
    if v_group_id is null or v_group_id = any(v_group_ids) or lower(btrim(v_group->>'name')) = any(v_group_names) then
      raise exception 'Crew group names must be unique' using errcode = '22023';
    end if;
    v_group_ids := array_append(v_group_ids, v_group_id);
    v_group_names := array_append(v_group_names, lower(btrim(v_group->>'name')));
    for v_member_text in select value from jsonb_array_elements_text(v_group->'memberIds') loop
      v_member := v_member_text::uuid;
      v_members := array_append(v_members, v_member);
    end loop;
  end loop;

  v_members := v_members || demo_private.validate_crew_visibility_rule(p_default_rule, v_group_ids);
  for v_entry_text in select jsonb_object_keys(p_entry_rules) loop
    v_entry := v_entry_text::uuid;
    if not exists (select 1 from public.customer_entries e where e.id = v_entry and e.customer_id = v_owner) then
      raise exception 'Entry does not belong to this account' using errcode = '42501';
    end if;
    v_members := v_members || demo_private.validate_crew_visibility_rule(p_entry_rules->v_entry_text, v_group_ids);
  end loop;

  if exists (
    select 1 from unnest(v_members) m where m = v_owner or not exists (
      select 1 from public.crew_invitations c where c.status = 'accepted'
        and ((c.requester_id = v_owner and c.recipient_id = m)
          or (c.recipient_id = v_owner and c.requester_id = m))
    )
  ) then raise exception 'Choose only approved Crew members' using errcode = '22023'; end if;

  insert into public.crew_visibility_settings(owner_id, default_rule, groups, entry_rules)
    values(v_owner, p_default_rule, p_groups, p_entry_rules)
    on conflict (owner_id) do update set default_rule = excluded.default_rule,
      groups = excluded.groups, entry_rules = excluded.entry_rules, updated_at = now();
  update public.customer_profiles set crew_discoverable = p_discoverable where customer_id = v_owner;
  if not found then raise exception 'Account profile is unavailable' using errcode = '22023'; end if;
end;
$$;
revoke all on function public.save_crew_visibility_settings(jsonb,jsonb,jsonb,boolean) from public, anon, authenticated, service_role;
grant execute on function public.save_crew_visibility_settings(jsonb,jsonb,jsonb,boolean) to authenticated;

drop policy "Owners and accepted Crew can see shared entry flags" on public.crew_entry_shares;
create policy "Owners and permitted Crew can see shared entry flags" on public.crew_entry_shares
  for select to authenticated using (
    owner_id = (select auth.uid())
    or public.crew_can_view_shared_entry(owner_id, entry_id)
  );

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
    where s.owner_id = p_member_id
      and public.crew_can_view_shared_entry(s.owner_id, s.entry_id)
    order by e.offering_slug, s.created_at desc
  ) s join demo_private.preview_entry_offerings o on o.slug = s.offering_slug;
  return v_picks;
end;
$$;
revoke all on function public.get_crew_shared_picks(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_crew_shared_picks(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
