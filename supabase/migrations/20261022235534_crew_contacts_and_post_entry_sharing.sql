-- Contacts are owner-only address-book data, never Crew permissions.
begin;
create function demo_private.validate_crew_group_contacts(p_groups jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare g jsonb; c jsonb; ids text[]; cid text; phone text; email text;
begin
  if jsonb_typeof(p_groups) is distinct from 'array' then return false; end if;
  for g in select value from jsonb_array_elements(p_groups) loop
    if not (g ? 'contacts') then continue; end if;
    if jsonb_typeof(g->'contacts') is distinct from 'array' then return false; end if;
    if jsonb_array_length(g->'contacts') > 100 then return false; end if;
    ids := '{}';
    for c in select value from jsonb_array_elements(g->'contacts') loop
      cid := c->>'id'; phone := c->>'phone'; email := c->>'email';
      if jsonb_typeof(c) is distinct from 'object'
        or coalesce(cid, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or cid = any(ids)
        or jsonb_typeof(c->'name') is distinct from 'string'
        or length(btrim(c->>'name')) not between 1 and 80
        or jsonb_typeof(c->'phone') is distinct from 'string'
        or jsonb_typeof(c->'email') is distinct from 'string'
        or length(phone) > 32 or length(email) > 254
        or (phone = '' and email = '')
        or (phone <> '' and (phone !~ '^\+?[0-9 ()-]+$'
          or length(regexp_replace(phone, '[^0-9]', '', 'g')) not between 10 and 15))
        or (email <> '' and email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
      then return false; end if;
      ids := array_append(ids, cid);
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function demo_private.validate_crew_group_contacts(jsonb) from public, anon, authenticated, service_role;
alter table public.crew_visibility_settings add constraint crew_contacts_valid
  check (demo_private.validate_crew_group_contacts(groups));

-- Preserve validated contacts on single-group saves as well as full-profile saves.
-- Unsaved search and pick-audience edits stay untouched.
create or replace function public.save_crew_visibility_group(p_group jsonb, p_remove boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_id uuid;
  v_groups jsonb;
  v_group jsonb;
  v_member_text text;
  v_member uuid;
  v_members uuid[] := '{}';
  v_entry_rules jsonb;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_remove is null or p_group is null or jsonb_typeof(p_group) <> 'object'
    or jsonb_typeof(p_group->'memberIds') <> 'array'
    or jsonb_array_length(p_group->'memberIds') > 100
    or length(btrim(coalesce(p_group->>'name', ''))) not between 1 and 50 then
    raise exception 'Invalid Crew group' using errcode = '22023';
  end if;
  v_id := (p_group->>'id')::uuid;
  if v_id is null then raise exception 'Invalid Crew group' using errcode = '22023'; end if;

  insert into public.crew_visibility_settings(owner_id) values(v_owner) on conflict(owner_id) do nothing;
  select groups, entry_rules into v_groups, v_entry_rules from public.crew_visibility_settings
    where owner_id = v_owner for update;

  if p_remove then
    if not exists (select 1 from jsonb_array_elements(v_groups) item where item->>'id' = v_id::text) then
      raise exception 'Crew group not found' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(item), '[]'::jsonb) into v_groups
      from jsonb_array_elements(v_groups) item where item->>'id' <> v_id::text;
    select coalesce(jsonb_object_agg(key, demo_private.without_crew_group(value, v_id::text)), '{}'::jsonb)
      into v_entry_rules from jsonb_each(v_entry_rules);
    update public.crew_visibility_settings set groups = v_groups,
      default_rule = demo_private.without_crew_group(default_rule, v_id::text),
      entry_rules = v_entry_rules, updated_at = now() where owner_id = v_owner;
    return;
  end if;

  if exists (select 1 from jsonb_array_elements(v_groups) item
    where item->>'id' <> v_id::text and lower(btrim(item->>'name')) = lower(btrim(p_group->>'name'))) then
    raise exception 'Crew group names must be unique' using errcode = '22023';
  end if;
  for v_member_text in select value from jsonb_array_elements_text(p_group->'memberIds') loop
    v_member := v_member_text::uuid;
    if v_member = any(v_members) then raise exception 'Duplicate Crew member' using errcode = '22023'; end if;
    v_members := array_append(v_members, v_member);
  end loop;
  if exists (
    select 1 from unnest(v_members) m where m = v_owner or not exists (
      select 1 from public.crew_invitations c where c.status = 'accepted'
        and ((c.requester_id = v_owner and c.recipient_id = m)
          or (c.recipient_id = v_owner and c.requester_id = m))
    )
  ) then raise exception 'Choose only approved Crew members' using errcode = '22023'; end if;

  select coalesce(jsonb_agg(item), '[]'::jsonb) into v_groups
    from jsonb_array_elements(v_groups) item where item->>'id' <> v_id::text;
  if jsonb_array_length(v_groups) >= 500 then raise exception 'Too many Crew groups' using errcode = '22023'; end if;
  update public.crew_visibility_settings set groups = v_groups || jsonb_build_array(jsonb_build_object(
    'id', v_id, 'name', btrim(p_group->>'name'), 'memberIds', p_group->'memberIds', 'contacts', coalesce(p_group->'contacts', '[]'::jsonb)
  )), updated_at = now() where owner_id = v_owner;
end;
$$;
revoke all on function public.save_crew_visibility_group(jsonb,boolean) from public, anon, authenticated, service_role;
grant execute on function public.save_crew_visibility_group(jsonb,boolean) to authenticated;


-- Share only confirmed entries owned by the caller. Set the audience and share
-- flags together so an entry never briefly inherits a broader default audience.
create function demo_private.share_confirmed_entry_with_crew(p_request_id uuid, p_group_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  selected_group jsonb;
  rules jsonb;
  rule jsonb;
  entry_id uuid;
  entry_ids uuid[];
  recipients integer;
begin
  if owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.entry_requests r where r.id = p_request_id
    and r.customer_id = owner and r.status = 'accepted') then
    raise exception 'Confirmed entry not found' using errcode = '42501';
  end if;
  select array_agg(e.id) into entry_ids from public.customer_entries e
    where e.customer_id = owner and e.entry_request_id = p_request_id;
  if coalesce(cardinality(entry_ids), 0) = 0 then
    raise exception 'Confirmed entry not found' using errcode = '22023';
  end if;
  insert into public.crew_visibility_settings(owner_id) values(owner) on conflict(owner_id) do nothing;
  select entry_rules into rules from public.crew_visibility_settings where owner_id = owner for update;
  if p_group_id is not null then
    select g into selected_group from public.crew_visibility_settings s,
      lateral jsonb_array_elements(s.groups) g
      where s.owner_id = owner and g->>'id' = p_group_id::text;
    if selected_group is null then raise exception 'Crew group not found' using errcode = '22023'; end if;
  end if;
  select count(*) into recipients from public.crew_invitations c where c.status = 'accepted'
    and ((c.requester_id = owner and (p_group_id is null or selected_group->'memberIds' ? c.recipient_id::text))
      or (c.recipient_id = owner and (p_group_id is null or selected_group->'memberIds' ? c.requester_id::text)));
  if recipients = 0 then raise exception 'Choose a group with approved Crew members' using errcode = '22023'; end if;
  rule := jsonb_build_object('audience', case when p_group_id is null then 'everyone' else 'groups' end,
    'memberIds', '[]'::jsonb, 'groupIds', case when p_group_id is null then '[]'::jsonb else jsonb_build_array(p_group_id) end);
  foreach entry_id in array entry_ids loop
    rules := jsonb_set(rules, array[entry_id::text], rule, true);
  end loop;
  if (select count(*) from jsonb_object_keys(rules)) > 500 then
    raise exception 'Too many individual sharing rules' using errcode = '22023';
  end if;
  update public.crew_visibility_settings set entry_rules = rules, updated_at = now() where owner_id = owner;
  insert into public.crew_entry_shares(entry_id, owner_id)
    select id, owner from unnest(entry_ids) id on conflict do nothing;
  return cardinality(entry_ids);
end;
$$;
revoke all on function demo_private.share_confirmed_entry_with_crew(uuid,uuid) from public, anon, authenticated, service_role;
grant usage on schema demo_private to authenticated;
grant execute on function demo_private.share_confirmed_entry_with_crew(uuid,uuid) to authenticated;
create function public.share_confirmed_entry_with_crew(p_request_id uuid, p_group_id uuid default null)
returns integer language sql security invoker set search_path = '' as $$
  select demo_private.share_confirmed_entry_with_crew(p_request_id, p_group_id);
$$;
revoke all on function public.share_confirmed_entry_with_crew(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.share_confirmed_entry_with_crew(uuid,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
