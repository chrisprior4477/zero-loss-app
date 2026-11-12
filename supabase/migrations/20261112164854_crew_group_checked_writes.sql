begin;

-- Keep the existing group, contact, membership and removal validation in
-- one writer. It can only be called by the checked function below.
alter function public.save_crew_visibility_group(jsonb, boolean) set schema demo_private;
alter function demo_private.save_crew_visibility_group(jsonb, boolean) rename to write_crew_visibility_group;
revoke all on function demo_private.write_crew_visibility_group(jsonb, boolean) from public, anon, authenticated, service_role;

create function demo_private.save_crew_group_checked(p_group jsonb, p_remove boolean, p_expected jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_id uuid;
  v_groups jsonb;
  v_saved jsonb;
  v_desired jsonb;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_remove is null or jsonb_typeof(p_group) is distinct from 'object' then
    raise exception 'Invalid Crew group' using errcode = '22023';
  end if;
  v_id := (p_group->>'id')::uuid;
  if v_id is null or (p_remove and p_expected is null)
    or (p_expected is not null and (jsonb_typeof(p_expected) is distinct from 'object'
      or (p_expected->>'id')::uuid is distinct from v_id)) then
    raise exception 'Review the saved Crew group first' using errcode = '22023';
  end if;

  insert into public.crew_visibility_settings(owner_id) values(v_owner) on conflict(owner_id) do nothing;
  select groups into v_groups from public.crew_visibility_settings where owner_id = v_owner for update;
  -- Compare the same approved-member view shown in the editors, including
  -- existing groups written before the optional contacts field was added.
  select g || jsonb_build_object(
    'contacts', coalesce(g->'contacts', '[]'::jsonb),
    'memberIds', (
      select coalesce(jsonb_agg(m.member_id order by m.position), '[]'::jsonb)
      from jsonb_array_elements_text(g->'memberIds') with ordinality m(member_id, position)
      where exists (select 1 from public.crew_invitations c where c.status = 'accepted'
        and ((c.requester_id = v_owner and c.recipient_id::text = m.member_id)
          or (c.recipient_id = v_owner and c.requester_id::text = m.member_id)))
    )
  ) into v_saved from jsonb_array_elements(v_groups) g where g->>'id' = v_id::text;

  v_desired := p_group || jsonb_build_object('id', v_id, 'name', btrim(p_group->>'name'), 'contacts', coalesce(p_group->'contacts', '[]'::jsonb));
  if p_expected is not null then
    p_expected := p_expected || jsonb_build_object('id', v_id, 'contacts', coalesce(p_expected->'contacts', '[]'::jsonb));
  end if;
  -- A repeated create or update is safe after a lost response if its exact
  -- desired value was already stored. A missing existing group is a conflict.
  if not p_remove and v_saved = v_desired then return; end if;
  if v_saved is distinct from p_expected then
    raise exception 'Crew group changed in another tab' using errcode = '40001';
  end if;
  perform demo_private.write_crew_visibility_group(v_desired, p_remove);
end;
$$;
revoke all on function demo_private.save_crew_group_checked(jsonb, boolean, jsonb) from public, anon, authenticated, service_role;
grant execute on function demo_private.save_crew_group_checked(jsonb, boolean, jsonb) to authenticated;

create function public.save_crew_group_checked(p_group jsonb, p_remove boolean, p_expected jsonb)
returns void language sql security invoker set search_path = '' as $$
  select demo_private.save_crew_group_checked(p_group, p_remove, p_expected);
$$;
revoke all on function public.save_crew_group_checked(jsonb, boolean, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_crew_group_checked(jsonb, boolean, jsonb) to authenticated;

-- Old tabs must refresh instead of silently applying unchecked writes.
create function public.save_crew_visibility_group(p_group jsonb, p_remove boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Refresh the page before saving a Crew group' using errcode = '40001';
end;
$$;
revoke all on function public.save_crew_visibility_group(jsonb, boolean) from public, anon, authenticated, service_role;
grant execute on function public.save_crew_visibility_group(jsonb, boolean) to authenticated;

-- Privacy saves carry saved groups as context for audience validation.
-- Group writes require a separate, explicit checked request.
create or replace function public.patch_crew_display_preferences(p_expected jsonb, p_desired jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if p_expected->'groups' is distinct from p_desired->'groups' then
    raise exception 'Save group changes separately from Privacy settings' using errcode = '40001';
  end if;
  return demo_private.patch_crew_display_preferences(p_expected, p_desired);
end;
$$;

notify pgrst, 'reload schema';
commit;
