-- Select several existing groups atomically, without temporarily sharing an
-- entry with everyone or replacing the first selected group with the last.
begin;
create function demo_private.share_confirmed_entry_with_crew_groups(p_request_id uuid,p_group_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare owner uuid:=auth.uid(); groups jsonb; rules jsonb; first_group uuid; entry_id uuid; changed integer;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_group_ids is null or coalesce(array_ndims(p_group_ids),0)<>1
    or cardinality(p_group_ids) not between 1 and 500 or array_position(p_group_ids,null) is not null
    or (select count(distinct id) from unnest(p_group_ids) id)<>cardinality(p_group_ids)
  then raise exception 'Choose saved Crew groups' using errcode='22023'; end if;
  select s.groups into groups from public.crew_visibility_settings s where s.owner_id=owner for update;
  if groups is null or (select count(*) from jsonb_array_elements(groups) g where (g->>'id')::uuid=any(p_group_ids))<>cardinality(p_group_ids)
  then raise exception 'Crew group not found' using errcode='22023'; end if;
  select (g->>'id')::uuid into first_group from jsonb_array_elements(groups) g
    where (g->>'id')::uuid=any(p_group_ids) and exists(select 1 from public.crew_invitations c where c.status='accepted'
      and ((c.requester_id=owner and g->'memberIds' ? c.recipient_id::text)
        or (c.recipient_id=owner and g->'memberIds' ? c.requester_id::text))) limit 1;
  if first_group is null then raise exception 'Choose a group with connected people' using errcode='22023'; end if;
  -- Reuse the canonical ownership, confirmation, and share-flag validations.
  changed:=demo_private.share_confirmed_entry_with_crew(p_request_id,first_group);
  select entry_rules into rules from public.crew_visibility_settings where owner_id=owner;
  for entry_id in select e.id from public.customer_entries e where e.customer_id=owner and e.entry_request_id=p_request_id loop
    rules:=jsonb_set(rules,array[entry_id::text],jsonb_build_object('audience','groups','memberIds','[]'::jsonb,'groupIds',to_jsonb(p_group_ids)),true);
  end loop;
  update public.crew_visibility_settings set entry_rules=rules,updated_at=now() where owner_id=owner;
  return changed;
end;
$$;
revoke all on function demo_private.share_confirmed_entry_with_crew_groups(uuid,uuid[]) from public,anon,authenticated,service_role;
grant execute on function demo_private.share_confirmed_entry_with_crew_groups(uuid,uuid[]) to authenticated;
create function public.share_confirmed_entry_with_crew_groups(p_request_id uuid,p_group_ids uuid[])
returns integer language sql security invoker set search_path = '' as $$
  select demo_private.share_confirmed_entry_with_crew_groups(p_request_id,p_group_ids);
$$;
revoke all on function public.share_confirmed_entry_with_crew_groups(uuid,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.share_confirmed_entry_with_crew_groups(uuid,uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
