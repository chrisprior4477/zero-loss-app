begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Keep audience clocks on the canonical share, under its existing ownership RLS.
alter table public.crew_entry_shares add column audience_shared_at jsonb not null default '{}'::jsonb
  check (jsonb_typeof(audience_shared_at)='object');

-- Accepted Crew retain access to the original share flags, but an owner's
-- audience-clock map is private. Read it only through the owner-bound reader.
revoke select on public.crew_entry_shares from authenticated;
grant select(entry_id,owner_id,created_at) on public.crew_entry_shares to authenticated;
create function demo_private.get_own_crew_shares(p_after uuid default null)
returns table(entry_id uuid,created_at timestamptz,audience_shared_at jsonb)
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();
begin
  if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
  return query select s.entry_id,s.created_at,s.audience_shared_at from public.crew_entry_shares s
    where s.owner_id=owner and (p_after is null or s.entry_id>p_after) order by s.entry_id limit 500;
end;
$$;
revoke all on function demo_private.get_own_crew_shares(uuid) from public,anon,authenticated,service_role;
grant execute on function demo_private.get_own_crew_shares(uuid) to authenticated;
create function public.get_own_crew_shares(p_after uuid default null)
returns table(entry_id uuid,created_at timestamptz,audience_shared_at jsonb)
language sql security invoker set search_path='' as $$ select * from demo_private.get_own_crew_shares(p_after); $$;
revoke all on function public.get_own_crew_shares(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_own_crew_shares(uuid) to authenticated;

create function demo_private.crew_share_scopes(p_rule jsonb) returns text[]
language sql immutable set search_path='' as $$
  select case when p_rule->>'audience'='groups' then
    array(select jsonb_array_elements_text(coalesce(p_rule->'groupIds','[]'::jsonb)))
  when p_rule->>'audience'='everyone' or
    (p_rule->>'audience'='people' and jsonb_array_length(coalesce(p_rule->'memberIds','[]'::jsonb))>0)
  then array['crew'] else array[]::text[] end;
$$;
revoke all on function demo_private.crew_share_scopes(jsonb) from public,anon,authenticated,service_role;

-- Existing shares retain their historical dates; do not restart their clocks.
update public.crew_entry_shares s set audience_shared_at=(
  select coalesce(jsonb_object_agg(scope,to_jsonb(s.created_at)),'{}'::jsonb)
  from unnest(demo_private.crew_share_scopes(coalesce(
    (select coalesce(v.entry_rules->s.entry_id::text,v.default_rule) from public.crew_visibility_settings v where v.owner_id=s.owner_id),
    '{"audience":"everyone","memberIds":[],"groupIds":[]}'::jsonb))) scope
);

create function demo_private.start_crew_share_clocks() returns trigger
language plpgsql security definer set search_path='' as $$
declare settings public.crew_visibility_settings%rowtype;
begin
  -- Match the settings-first lock order used by sharing, cleanup and Undo.
  insert into public.crew_visibility_settings(owner_id) values(new.owner_id) on conflict do nothing;
  select * into settings from public.crew_visibility_settings where owner_id=new.owner_id for update;
  -- Ignore client-supplied clocks. Only trusted Undo restores historical dates.
  select coalesce(jsonb_object_agg(scope,to_jsonb(clock_timestamp())),'{}'::jsonb) into new.audience_shared_at
    from unnest(demo_private.crew_share_scopes(coalesce(settings.entry_rules->new.entry_id::text,settings.default_rule))) scope;
  return new;
end;
$$;
revoke all on function demo_private.start_crew_share_clocks() from public,anon,authenticated,service_role;
create trigger start_crew_share_clocks before insert on public.crew_entry_shares
  for each row execute function demo_private.start_crew_share_clocks();

create function demo_private.sync_crew_audience_clocks() returns trigger
language plpgsql security definer set search_path='' as $$
declare item record; old_rule jsonb; new_rule jsonb; old_scopes text[]; new_scopes text[];
  scope text; clocks jsonb; stamp timestamptz:=clock_timestamp();
begin
  if tg_op='UPDATE' and new.default_rule is not distinct from old.default_rule and new.entry_rules is not distinct from old.entry_rules then return new; end if;
  for item in select s.* from public.crew_entry_shares s where s.owner_id=new.owner_id
    and (tg_op='INSERT' or coalesce(new.entry_rules->s.entry_id::text,new.default_rule)
      is distinct from coalesce(old.entry_rules->s.entry_id::text,old.default_rule))
    order by s.entry_id for update loop
    old_rule:=case when tg_op='INSERT' then '{"audience":"everyone","memberIds":[],"groupIds":[]}'::jsonb else coalesce(old.entry_rules->item.entry_id::text,old.default_rule) end;
    new_rule:=coalesce(new.entry_rules->item.entry_id::text,new.default_rule);
    old_scopes:=demo_private.crew_share_scopes(old_rule);
    new_scopes:=demo_private.crew_share_scopes(new_rule);
    clocks:='{}'::jsonb;
    foreach scope in array new_scopes loop
      if scope=any(old_scopes) then
        clocks:=clocks||jsonb_build_object(scope,coalesce(item.audience_shared_at->scope,to_jsonb(item.created_at)));
      else
        clocks:=clocks||jsonb_build_object(scope,to_jsonb(stamp));
      end if;
    end loop;
    if clocks is distinct from item.audience_shared_at then
      update public.crew_entry_shares set audience_shared_at=clocks where entry_id=item.entry_id and owner_id=new.owner_id;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function demo_private.sync_crew_audience_clocks() from public,anon,authenticated,service_role;
create trigger sync_crew_audience_clocks after insert or update of default_rule,entry_rules,groups on public.crew_visibility_settings
  for each row execute function demo_private.sync_crew_audience_clocks();

-- Cleanup and Undo replacements are appended below. Their authorization,
-- replay protection and settings-row locks remain in place.

create or replace function demo_private.cleanup_crew_shares(p_operation_id uuid,p_scope text,p_offering_slug text default null,p_entry_id uuid default null,p_before timestamptz default null)
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
  for item in select s.entry_id,s.created_at,s.audience_shared_at from public.crew_entry_shares s
    join public.customer_entries e on e.id=s.entry_id and e.customer_id=owner
    where s.owner_id=owner and (p_entry_id is null or e.id=p_entry_id)
      and (p_offering_slug is null or e.offering_slug=p_offering_slug)
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

create or replace function demo_private.undo_crew_share_cleanup(p_operation_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); batch demo_private.crew_share_cleanups%rowtype;
  settings public.crew_visibility_settings%rowtype; item jsonb; rules jsonb; current_share timestamptz; current_clocks jsonb; entry uuid;
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
    select s.created_at,s.audience_shared_at into current_share,current_clocks from public.crew_entry_shares s where s.entry_id=entry and s.owner_id=owner for update;
    if (item ? 'afterAudienceSharedAt' and coalesce(current_clocks,'null'::jsonb) is distinct from item->'afterAudienceSharedAt')
      or (not item ? 'afterAudienceSharedAt' and exists(select 1 from jsonb_each_text(coalesce(current_clocks,'{}'::jsonb)) c where c.value::timestamptz>batch.created_at))
      or ((item->>'keepShared')::boolean and current_share is distinct from (item->>'createdAt')::timestamptz)
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
  -- Undo restores the exact clocks. Older cleanup receipts retain their original
  -- removed-scope date while preserving clocks of surviving audiences.
  for item in select value from jsonb_array_elements(batch.items) loop
    update public.crew_entry_shares s set audience_shared_at=case
      when item ? 'audienceSharedAt' then item->'audienceSharedAt'
      else s.audience_shared_at||jsonb_build_object(batch.request->>'scope',item->>'createdAt') end
    where s.entry_id=(item->>'id')::uuid and s.owner_id=owner;
  end loop;
  update demo_private.crew_share_cleanups set undone_at=now() where id=p_operation_id;
  return jsonb_array_length(batch.items);
end; $$;

notify pgrst,'reload schema';
commit;
