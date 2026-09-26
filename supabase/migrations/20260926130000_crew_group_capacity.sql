-- Raise the practical group capacity while retaining bounded request validation.
begin;

create or replace function demo_private.validate_crew_visibility_rule(p_rule jsonb, p_group_ids uuid[])
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
    or jsonb_array_length(p_rule->'groupIds') > 500 then
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

create or replace function public.save_crew_visibility_settings(
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
    or jsonb_array_length(p_groups) > 500
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

create function demo_private.without_crew_group(p_rule jsonb, p_group_id text)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_set(p_rule, '{groupIds}', coalesce((
    select jsonb_agg(value) from jsonb_array_elements(coalesce(p_rule->'groupIds', '[]'::jsonb))
    where value #>> '{}' <> p_group_id
  ), '[]'::jsonb));
$$;
revoke all on function demo_private.without_crew_group(jsonb,text) from public, anon, authenticated, service_role;

-- This action changes only one group. Unsaved search and pick-audience edits stay untouched.
create function public.save_crew_visibility_group(p_group jsonb, p_remove boolean)
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
    'id', v_id, 'name', btrim(p_group->>'name'), 'memberIds', p_group->'memberIds'
  )), updated_at = now() where owner_id = v_owner;
end;
$$;
revoke all on function public.save_crew_visibility_group(jsonb,boolean) from public, anon, authenticated, service_role;
grant execute on function public.save_crew_visibility_group(jsonb,boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
