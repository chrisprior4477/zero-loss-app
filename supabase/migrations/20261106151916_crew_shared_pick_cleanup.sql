-- Owner-only, audience-scoped cleanup. Entries and financial records are untouched.
begin;
create table demo_private.crew_share_cleanups (
  id uuid primary key,
  owner_id uuid not null references public.customers(id) on delete cascade,
  request jsonb not null,
  groups_snapshot jsonb not null,
  items jsonb not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
alter table demo_private.crew_share_cleanups enable row level security;
revoke all on demo_private.crew_share_cleanups from public,anon,authenticated,service_role;
create index crew_share_cleanups_owner on demo_private.crew_share_cleanups(owner_id,created_at desc);

create function demo_private.cleanup_crew_shares(p_operation_id uuid,p_scope text,p_offering_slug text default null,p_entry_id uuid default null,p_before timestamptz default null)
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
    or (p_before is not null and p_before>now()) then raise exception 'Invalid sharing selection' using errcode='22023'; end if;
  request:=jsonb_build_object('scope',p_scope,'slug',p_offering_slug,'entry',p_entry_id,'before',p_before);
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
  for item in select s.entry_id,s.created_at from public.crew_entry_shares s
    join public.customer_entries e on e.id=s.entry_id and e.customer_id=owner
    where s.owner_id=owner and (p_entry_id is null or e.id=p_entry_id)
      and (p_offering_slug is null or e.offering_slug=p_offering_slug)
      and (p_before is null or s.created_at<p_before)
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
      'beforeRule',rules->item.entry_id::text,'effectiveRule',rule,'afterRule',after_rule,'keepShared',keep_shared));
    rules:=jsonb_set(rules,array[item.entry_id::text],after_rule,true);
    if not keep_shared then delete from public.crew_entry_shares where entry_id=item.entry_id and owner_id=owner; end if;
  end loop;
  update public.crew_visibility_settings set entry_rules=rules,updated_at=now() where owner_id=owner;
  insert into demo_private.crew_share_cleanups(id,owner_id,request,groups_snapshot,items) values(p_operation_id,owner,request,settings.groups,snapshots);
  return jsonb_build_object('id',p_operation_id,'count',jsonb_array_length(snapshots),'undone',false);
end; $$;

create function demo_private.undo_crew_share_cleanup(p_operation_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); batch demo_private.crew_share_cleanups%rowtype;
  settings public.crew_visibility_settings%rowtype; item jsonb; rules jsonb; current_share timestamptz; entry uuid;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  -- Match cleanup's lock order to prevent concurrent cleanup/undo deadlocks.
  select * into settings from public.crew_visibility_settings s where s.owner_id=owner for update;
  select * into batch from demo_private.crew_share_cleanups c where c.id=p_operation_id and c.owner_id=owner for update;
  if not found then raise exception 'Cleanup unavailable' using errcode='42501'; end if;
  if batch.undone_at is not null then return jsonb_array_length(batch.items); end if;
  if batch.created_at<now()-interval '1 day' then raise exception 'Undo expired' using errcode='22023'; end if;
  if settings.groups is distinct from batch.groups_snapshot then raise exception 'Groups changed since cleanup' using errcode='40001'; end if;
  rules:=settings.entry_rules;
  for item in select value from jsonb_array_elements(batch.items) loop
    entry:=(item->>'id')::uuid;
    if not exists(select 1 from public.customer_entries e where e.id=entry and e.customer_id=owner)
      or rules->entry::text is distinct from item->'afterRule'
      or (item->'beforeRule'='null'::jsonb and settings.default_rule is distinct from item->'effectiveRule') then
      raise exception 'Sharing changed since cleanup; review your current settings' using errcode='40001'; end if;
    if item->'effectiveRule'->>'audience'='groups' and exists(
      select 1 from jsonb_array_elements_text(item->'effectiveRule'->'groupIds') id
      where not exists(select 1 from jsonb_array_elements(settings.groups) g where g->>'id'=id)) then
      raise exception 'A group changed since cleanup' using errcode='40001'; end if;
    select s.created_at into current_share from public.crew_entry_shares s where s.entry_id=entry and s.owner_id=owner for update;
    if ((item->>'keepShared')::boolean and current_share is distinct from (item->>'createdAt')::timestamptz)
      or (not (item->>'keepShared')::boolean and current_share is not null) then
      raise exception 'Sharing changed since cleanup; review your current settings' using errcode='40001'; end if;
  end loop;
  for item in select value from jsonb_array_elements(batch.items) loop
    entry:=(item->>'id')::uuid;
    if item->'beforeRule'='null'::jsonb then rules:=rules-entry::text;
    else rules:=jsonb_set(rules,array[entry::text],item->'beforeRule',true); end if;
  end loop;
  update public.crew_visibility_settings set entry_rules=rules,updated_at=now() where owner_id=owner;
  -- Restore the original timestamp; undo is not a new share or an email send.
  insert into public.crew_entry_shares(entry_id,owner_id,created_at)
    select (j->>'id')::uuid,owner,(j->>'createdAt')::timestamptz from jsonb_array_elements(batch.items) j
    where not (j->>'keepShared')::boolean on conflict(entry_id) do nothing;
  update demo_private.crew_share_cleanups set undone_at=now() where id=p_operation_id;
  return jsonb_array_length(batch.items);
end; $$;

create function demo_private.share_owned_crew_entry(p_entry_id uuid,p_scope text)
returns void language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); settings public.crew_visibility_settings%rowtype; rule jsonb; already_shared boolean;
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.customer_entries e where e.id=p_entry_id and e.customer_id=owner)
    then raise exception 'Entry unavailable' using errcode='42501'; end if;
  insert into public.crew_visibility_settings(owner_id) values(owner) on conflict do nothing;
  select * into settings from public.crew_visibility_settings s where s.owner_id=owner for update;
  select exists(select 1 from public.crew_entry_shares s where s.entry_id=p_entry_id and s.owner_id=owner) into already_shared;
  rule:=coalesce(settings.entry_rules->p_entry_id::text,settings.default_rule);
  if p_scope='crew' then
    if already_shared and rule->>'audience'='groups' then raise exception 'Use Privacy Settings to change an existing group audience' using errcode='22023'; end if;
    if not already_shared then rule:=jsonb_build_object('audience','everyone','memberIds','[]'::jsonb,'groupIds','[]'::jsonb); end if;
  else
    if p_scope is null or not exists(select 1 from jsonb_array_elements(settings.groups) g where g->>'id'=p_scope)
      then raise exception 'Group unavailable' using errcode='22023'; end if;
    if already_shared and rule->>'audience'<>'groups' then raise exception 'Use Privacy Settings to change an existing Crew audience' using errcode='22023'; end if;
    if not already_shared then rule:=jsonb_build_object('audience','groups','memberIds','[]'::jsonb,'groupIds',jsonb_build_array(p_scope));
    elsif not rule->'groupIds' ? p_scope then rule:=jsonb_set(rule,'{groupIds}',(rule->'groupIds')||jsonb_build_array(p_scope)); end if;
  end if;
  update public.crew_visibility_settings set entry_rules=jsonb_set(entry_rules,array[p_entry_id::text],rule,true),updated_at=now() where owner_id=owner;
  insert into public.crew_entry_shares(entry_id,owner_id) values(p_entry_id,owner) on conflict(entry_id) do nothing;
end; $$;

revoke all on function demo_private.cleanup_crew_shares(uuid,text,text,uuid,timestamptz),demo_private.undo_crew_share_cleanup(uuid),demo_private.share_owned_crew_entry(uuid,text) from public,anon,authenticated,service_role;
grant execute on function demo_private.cleanup_crew_shares(uuid,text,text,uuid,timestamptz),demo_private.undo_crew_share_cleanup(uuid),demo_private.share_owned_crew_entry(uuid,text) to authenticated;
create function public.cleanup_crew_shares(p_operation_id uuid,p_scope text,p_offering_slug text default null,p_entry_id uuid default null,p_before timestamptz default null)
returns jsonb language sql security invoker set search_path='' as $$ select demo_private.cleanup_crew_shares(p_operation_id,p_scope,p_offering_slug,p_entry_id,p_before); $$;
create function public.undo_crew_share_cleanup(p_operation_id uuid) returns integer language sql security invoker set search_path='' as $$ select demo_private.undo_crew_share_cleanup(p_operation_id); $$;
create function public.share_owned_crew_entry(p_entry_id uuid,p_scope text) returns void language sql security invoker set search_path='' as $$ select demo_private.share_owned_crew_entry(p_entry_id,p_scope); $$;
revoke all on function public.cleanup_crew_shares(uuid,text,text,uuid,timestamptz),public.undo_crew_share_cleanup(uuid),public.share_owned_crew_entry(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.cleanup_crew_shares(uuid,text,text,uuid,timestamptz),public.undo_crew_share_cleanup(uuid),public.share_owned_crew_entry(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
