begin;

-- A Privacy save compares and validates the edits under the same owner lock
-- used by group editing and cleanup. Historical rules stay in place.
create or replace function demo_private.patch_crew_display_preferences(p_expected jsonb, p_desired jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_saved public.crew_visibility_settings%rowtype;
  v_snapshot jsonb;
  v_current jsonb;
  v_merged jsonb;
  v_path text[];
  v_id text;
  v_before jsonb;
  v_after jsonb;
  v_now jsonb;
  v_changed_ids text[];
  v_group_ids uuid[];
  v_member_ids uuid[] := '{}';
  v_removed_ids text[] := '{}';
  v_replacements jsonb := '{}';
  v_next_rules jsonb;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_expected->'groups' is distinct from p_desired->'groups' then
    raise exception 'Save group changes separately from Privacy settings' using errcode = 'PT409';
  end if;
  foreach v_snapshot in array array[p_expected, p_desired] loop
    if jsonb_typeof(v_snapshot) is distinct from 'object'
      or jsonb_typeof(v_snapshot->'entryRules') is distinct from 'object'
      or jsonb_typeof(v_snapshot->'defaultRule') is distinct from 'object'
      or jsonb_typeof(v_snapshot->'discoverable') is distinct from 'boolean'
      or jsonb_typeof(v_snapshot#>'{discovery,real}') is distinct from 'boolean'
      or jsonb_typeof(v_snapshot#>'{discovery,email}') is distinct from 'boolean'
      or jsonb_typeof(v_snapshot#>'{discovery,phone}') is distinct from 'boolean'
    then raise exception 'Invalid Crew settings' using errcode = '22023'; end if;
  end loop;

  -- Full snapshots from existing callers are still accepted. Only changed
  -- keys count against the existing per-save bound.
  select coalesce(array_agg(coalesce(b.key, a.key)), '{}') into v_changed_ids
    from jsonb_each(p_expected->'entryRules') b
    full join jsonb_each(p_desired->'entryRules') a using (key)
    where b.value is distinct from a.value;
  if cardinality(v_changed_ids) > 500 then
    raise exception 'Too many changed Crew audiences' using errcode = '22023';
  end if;

  insert into public.crew_visibility_settings(owner_id) values(v_owner) on conflict(owner_id) do nothing;
  select * into strict v_saved from public.crew_visibility_settings where owner_id = v_owner for update;
  select jsonb_build_object(
    'discoverable', p.crew_discoverable,
    'discovery', jsonb_build_object('real', p.crew_find_real_name, 'email', p.crew_find_email, 'phone', p.crew_find_phone)
  ) into v_current from public.customer_profiles p where p.customer_id = v_owner for update;
  if v_current is null then raise exception 'Account profile is unavailable' using errcode = '42501'; end if;
  v_current := v_current || jsonb_build_object('defaultRule', v_saved.default_rule);
  v_merged := v_current;

  for v_path in select array['defaultRule'] union all select array['discoverable']
    union all select array['discovery','real'] union all select array['discovery','email'] union all select array['discovery','phone']
  loop
    v_before := p_expected#>v_path;
    v_after := p_desired#>v_path;
    v_now := v_current#>v_path;
    if v_after is distinct from v_before and v_after is distinct from v_now then
      if v_now is distinct from v_before then
        raise exception 'Crew settings changed in another tab' using errcode = 'PT409';
      end if;
      v_merged := jsonb_set(v_merged, v_path, v_after);
    end if;
  end loop;

  if cardinality(v_changed_ids) > 0 or v_merged->'defaultRule' is distinct from v_saved.default_rule then
    select coalesce(array_agg((g->>'id')::uuid), '{}') into v_group_ids from jsonb_array_elements(v_saved.groups) g;
  end if;
  if v_merged->'defaultRule' is distinct from v_saved.default_rule then
    v_member_ids := demo_private.validate_crew_visibility_rule(v_merged->'defaultRule', v_group_ids);
  end if;

  foreach v_id in array v_changed_ids loop
    if not exists(select 1 from public.customer_entries e where e.id = v_id::uuid and e.customer_id = v_owner) then
      raise exception 'Entry does not belong to this account' using errcode = '42501';
    end if;
    v_before := p_expected->'entryRules'->v_id;
    v_after := p_desired->'entryRules'->v_id;
    v_now := v_saved.entry_rules->v_id;
    if v_after is not distinct from v_now then continue; end if;
    if v_now is distinct from v_before then
      raise exception 'Pick audience changed in another tab' using errcode = 'PT409';
    end if;
    if v_after is null then
      v_removed_ids := array_append(v_removed_ids, v_id);
    else
      v_member_ids := v_member_ids || demo_private.validate_crew_visibility_rule(v_after, v_group_ids);
      v_replacements := v_replacements || jsonb_build_object(v_id, v_after);
    end if;
  end loop;
  if exists (
    select 1 from unnest(v_member_ids) m where m = v_owner or not exists (
      select 1 from public.crew_invitations c where c.status = 'accepted'
        and ((c.requester_id = v_owner and c.recipient_id = m)
          or (c.recipient_id = v_owner and c.requester_id = m))
    )
  ) then raise exception 'Choose only approved Crew members' using errcode = '22023'; end if;

  v_next_rules := v_saved.entry_rules;
  if cardinality(v_removed_ids) > 0 or v_replacements <> '{}'::jsonb then
    v_next_rules := (v_next_rules - v_removed_ids) || v_replacements;
  end if;
  if v_merged->'defaultRule' is distinct from v_saved.default_rule or v_next_rules is distinct from v_saved.entry_rules then
    update public.crew_visibility_settings
      set default_rule = v_merged->'defaultRule', entry_rules = v_next_rules, updated_at = now()
      where owner_id = v_owner;
  end if;
  if (v_merged - 'defaultRule') is distinct from (v_current - 'defaultRule') then
    perform demo_private.save_crew_discovery((v_merged->>'discoverable')::boolean,
      (v_merged#>>'{discovery,real}')::boolean, (v_merged#>>'{discovery,email}')::boolean, (v_merged#>>'{discovery,phone}')::boolean);
  end if;
  return v_merged || jsonb_build_object('groups', v_saved.groups, 'entryRules', v_next_rules);
end;
$$;

notify pgrst, 'reload schema';
commit;
