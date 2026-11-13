-- Limit a bulk confirmation to the entries its review displayed.
create or replace function demo_private.cleanup_crew_shares(p_operation_id uuid,p_scope text,p_offering_slug text,p_entry_id uuid,p_before timestamptz,p_reviewed_entry_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  owner uuid:=auth.uid(); settings public.crew_visibility_settings%rowtype;
  previous demo_private.crew_share_cleanups%rowtype; request jsonb;
  item record; rule jsonb; after_rule jsonb; rules jsonb; targets jsonb;
  snapshots jsonb:='[]'::jsonb; keep_shared boolean;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_operation_id is null or p_scope is null or (p_scope<>'crew' and p_scope !~ '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$')
    or (p_offering_slug is not null and p_offering_slug !~ '^[a-z0-9-]{2,100}$')
    or (p_reviewed_entry_ids is not null and (cardinality(p_reviewed_entry_ids)=0 or array_position(p_reviewed_entry_ids,null) is not null))
    or (p_before is not null and p_before>now()) then raise exception 'Invalid sharing selection' using errcode='22023'; end if;
  request:=jsonb_build_object('scope',p_scope,'slug',p_offering_slug,'entry',p_entry_id,'before',p_before);
  if p_reviewed_entry_ids is not null then
    request:=request||jsonb_build_object('reviewedEntries',p_reviewed_entry_ids);
  end if;
  insert into public.crew_visibility_settings(owner_id) values(owner) on conflict do nothing;
  select * into settings from public.crew_visibility_settings s where s.owner_id=owner for update;
  select * into previous from demo_private.crew_share_cleanups c where c.id=p_operation_id;
  if found then
    if previous.owner_id<>owner or previous.request<>request then raise exception 'Cleanup request unavailable' using errcode='42501'; end if;
    return jsonb_build_object('id',previous.id,'count',jsonb_array_length(previous.items),'undone',previous.undone_at is not null);
  end if;
  if p_scope<>'crew' and not exists(select 1 from jsonb_array_elements(settings.groups) g where g->>'id'=p_scope)
    then raise exception 'Group unavailable' using errcode='22023'; end if;
  if p_entry_id is not null and not exists(select 1 from public.customer_entries e where e.id=p_entry_id and e.customer_id=owner)
    then raise exception 'Entry unavailable' using errcode='42501'; end if;
  rules:=settings.entry_rules;
  for item in select s.entry_id,s.created_at,s.audience_shared_at from public.crew_entry_shares s
    join public.customer_entries e on e.id=s.entry_id and e.customer_id=owner
    where s.owner_id=owner and (p_entry_id is null or e.id=p_entry_id)
      and (p_offering_slug is null or e.offering_slug=p_offering_slug)
      and (p_reviewed_entry_ids is null or e.id=any(p_reviewed_entry_ids))
      and (p_before is null or (s.audience_shared_at->>p_scope)::timestamptz<p_before)
    order by s.entry_id for update of s
  loop
    rule:=coalesce(rules->item.entry_id::text,settings.default_rule);
    if p_scope='crew' then
      if rule->>'audience' not in ('everyone','people') or (rule->>'audience'='people' and jsonb_array_length(rule->'memberIds')=0) then continue; end if;
      after_rule:=rule; keep_shared:=false;
    else
      if rule->>'audience'<>'groups' or not coalesce(rule->'groupIds','[]') ? p_scope then continue; end if;
      select coalesce(jsonb_agg(value),'[]') into targets from jsonb_array_elements(rule->'groupIds') where value<>to_jsonb(p_scope);
      -- Freeze the surviving audience, even when this entry used the default rule.
      after_rule:=jsonb_set(rule,'{groupIds}',targets);
      keep_shared:=jsonb_array_length(targets)>0;
    end if;
    snapshots:=snapshots||jsonb_build_array(jsonb_build_object('id',item.entry_id,'createdAt',item.created_at,
      'beforeRule',rules->item.entry_id::text,'effectiveRule',rule,'afterRule',after_rule,'keepShared',keep_shared,
      'audienceSharedAt',item.audience_shared_at,
      'afterAudienceSharedAt',case when keep_shared then item.audience_shared_at-p_scope else null end));
    rules:=jsonb_set(rules,array[item.entry_id::text],after_rule,true);
    if not keep_shared then delete from public.crew_entry_shares where entry_id=item.entry_id and owner_id=owner; end if;
  end loop;
  update public.crew_visibility_settings set entry_rules=rules,updated_at=now() where owner_id=owner;
  insert into demo_private.crew_share_cleanups(id,owner_id,request,groups_snapshot,items) values(p_operation_id,owner,request,settings.groups,snapshots);
  return jsonb_build_object('id',p_operation_id,'count',jsonb_array_length(snapshots),'undone',false);
end; $$;

-- Retain the five-argument contract for the single-prize and single-entry controls and older clients.
create or replace function demo_private.cleanup_crew_shares(p_operation_id uuid,p_scope text,p_offering_slug text default null,p_entry_id uuid default null,p_before timestamptz default null)
returns jsonb language sql security invoker set search_path='' as $$
  select demo_private.cleanup_crew_shares(p_operation_id,p_scope,p_offering_slug,p_entry_id,p_before,null::uuid[]);
$$;

create function public.cleanup_crew_shares(p_operation_id uuid,p_scope text,p_offering_slug text,p_entry_id uuid,p_before timestamptz,p_reviewed_entry_ids uuid[])
returns jsonb language sql security invoker set search_path='' as $$
  select demo_private.cleanup_crew_shares(p_operation_id,p_scope,p_offering_slug,p_entry_id,p_before,coalesce(p_reviewed_entry_ids,array[]::uuid[]));
$$;

revoke all on function demo_private.cleanup_crew_shares(uuid,text,text,uuid,timestamptz,uuid[]),
  public.cleanup_crew_shares(uuid,text,text,uuid,timestamptz,uuid[]) from public,anon,authenticated,service_role;
grant execute on function demo_private.cleanup_crew_shares(uuid,text,text,uuid,timestamptz,uuid[]),
  public.cleanup_crew_shares(uuid,text,text,uuid,timestamptz,uuid[]) to authenticated;
