begin;

-- Merge only edited fields under an owner-row lock. A stale draft may not
-- restore a cleaned-up audience, overwrite a group, or remove a newer group.
create function demo_private.patch_crew_display_preferences(p_expected jsonb, p_desired jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_current jsonb;
  v_merged jsonb;
  v_snapshot jsonb;
  v_expected jsonb := p_expected;
  v_desired jsonb := p_desired;
  v_path text[];
  v_id text;
  v_before jsonb;
  v_after jsonb;
  v_now jsonb;
  v_groups jsonb;
  v_rules jsonb;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  foreach v_snapshot in array array[p_expected, p_desired] loop
    if jsonb_typeof(v_snapshot) is distinct from 'object'
      or jsonb_typeof(v_snapshot->'groups') is distinct from 'array'
      or jsonb_typeof(v_snapshot->'entryRules') is distinct from 'object'
      or jsonb_typeof(v_snapshot->'defaultRule') is distinct from 'object'
      or jsonb_typeof(v_snapshot->'discoverable') is distinct from 'boolean'
      or jsonb_typeof(v_snapshot#>'{discovery,real}') is distinct from 'boolean'
      or jsonb_typeof(v_snapshot#>'{discovery,email}') is distinct from 'boolean'
      or jsonb_typeof(v_snapshot#>'{discovery,phone}') is distinct from 'boolean' then
      raise exception 'Invalid Crew settings' using errcode = '22023';
    end if;
    if jsonb_array_length(v_snapshot->'groups') > 500
      or (select count(*) from jsonb_object_keys(v_snapshot->'entryRules')) > 500 then
      raise exception 'Invalid Crew settings' using errcode = '22023';
    end if;
  end loop;
  -- Older groups omit optional contacts; treat that as an empty contact list.
  v_expected := jsonb_set(v_expected, '{groups}', (select coalesce(jsonb_agg(g || jsonb_build_object('contacts',coalesce(g->'contacts','[]'::jsonb))), '[]'::jsonb) from jsonb_array_elements(v_expected->'groups') g));
  v_desired := jsonb_set(v_desired, '{groups}', (select coalesce(jsonb_agg(g || jsonb_build_object('contacts',coalesce(g->'contacts','[]'::jsonb))), '[]'::jsonb) from jsonb_array_elements(v_desired->'groups') g));

  insert into public.crew_visibility_settings(owner_id) values(v_owner) on conflict(owner_id) do nothing;
  perform 1 from public.crew_visibility_settings where owner_id=v_owner for update;
  perform 1 from public.customer_profiles where customer_id=v_owner for update;
  select jsonb_build_object(
    'defaultRule',s.default_rule, 'groups',s.groups, 'entryRules',s.entry_rules,
    'discoverable',p.crew_discoverable,
    'discovery',jsonb_build_object('real',p.crew_find_real_name,'email',p.crew_find_email,'phone',p.crew_find_phone)
  ) into v_current from public.crew_visibility_settings s join public.customer_profiles p on p.customer_id=s.owner_id where s.owner_id=v_owner;
  if v_current is null then raise exception 'Account profile is unavailable' using errcode = '42501'; end if;
  v_current := jsonb_set(v_current, '{groups}', (select coalesce(jsonb_agg(g || jsonb_build_object('contacts',coalesce(g->'contacts','[]'::jsonb))), '[]'::jsonb) from jsonb_array_elements(v_current->'groups') g));
  v_merged := v_current;

  for v_path in select array['defaultRule'] union all select array['discoverable'] union all select array['discovery','real'] union all select array['discovery','email'] union all select array['discovery','phone'] loop
    if v_desired#>v_path is distinct from v_expected#>v_path then
      if v_current#>v_path is distinct from v_expected#>v_path and v_current#>v_path is distinct from v_desired#>v_path then
        raise exception 'Crew settings changed in another tab' using errcode = '40001';
      end if;
      v_merged := jsonb_set(v_merged,v_path,v_desired#>v_path);
    end if;
  end loop;

  v_groups := v_current->'groups';
  for v_id in select g->>'id' from jsonb_array_elements(v_expected->'groups') g union select g->>'id' from jsonb_array_elements(v_desired->'groups') g loop
    select g into v_before from jsonb_array_elements(v_expected->'groups') g where g->>'id'=v_id;
    select g into v_after from jsonb_array_elements(v_desired->'groups') g where g->>'id'=v_id;
    select g into v_now from jsonb_array_elements(v_current->'groups') g where g->>'id'=v_id;
    if v_after is distinct from v_before and v_after is distinct from v_now then
      if v_now is distinct from v_before then raise exception 'Crew group changed in another tab' using errcode = '40001'; end if;
      if v_now is null then v_groups := v_groups || jsonb_build_array(v_after);
      else
        select coalesce(jsonb_agg(case when g->>'id'=v_id then v_after else g end),'[]'::jsonb) into v_groups
          from jsonb_array_elements(v_groups) g where g->>'id'<>v_id or v_after is not null;
      end if;
    end if;
  end loop;
  v_merged := jsonb_set(v_merged,'{groups}',v_groups);

  v_rules := v_current->'entryRules';
  for v_id in select jsonb_object_keys(v_expected->'entryRules') union select jsonb_object_keys(v_desired->'entryRules') loop
    v_before := v_expected->'entryRules'->v_id;
    v_after := v_desired->'entryRules'->v_id;
    v_now := v_current->'entryRules'->v_id;
    if v_after is distinct from v_before and v_after is distinct from v_now then
      if v_now is distinct from v_before then raise exception 'Pick audience changed in another tab' using errcode = '40001'; end if;
      if v_after is null then v_rules := v_rules-v_id;
      else v_rules := jsonb_set(v_rules,array[v_id],v_after); end if;
    end if;
  end loop;
  v_merged := jsonb_set(v_merged,'{entryRules}',v_rules);
  -- Reuse ownership, approved-member, contact and audience validation.
  perform public.save_crew_visibility_settings(v_merged->'defaultRule',v_groups,v_rules,(v_merged->>'discoverable')::boolean);
  perform demo_private.save_crew_discovery((v_merged->>'discoverable')::boolean,(v_merged#>>'{discovery,real}')::boolean,(v_merged#>>'{discovery,email}')::boolean,(v_merged#>>'{discovery,phone}')::boolean);
  return v_merged;
end;
$$;
revoke all on function demo_private.patch_crew_display_preferences(jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function demo_private.patch_crew_display_preferences(jsonb,jsonb) to authenticated;
create function public.patch_crew_display_preferences(p_expected jsonb,p_desired jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select demo_private.patch_crew_display_preferences(p_expected,p_desired); $$;
revoke all on function public.patch_crew_display_preferences(jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.patch_crew_display_preferences(jsonb,jsonb) to authenticated;

-- Already-open, older builds must refresh instead of replacing a full snapshot.
create or replace function demo_private.save_crew_display_preferences(p_default_rule jsonb,p_groups jsonb,p_entry_rules jsonb,p_discoverable boolean,p_real boolean,p_email boolean,p_phone boolean)
returns void language plpgsql security definer set search_path='' as $$ begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  raise exception 'Refresh this page before saving Crew settings' using errcode='40001';
end; $$;

notify pgrst,'reload schema';
commit;
