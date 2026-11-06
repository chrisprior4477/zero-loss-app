begin;
-- Restoring a private pick to My Crew keeps its individually selected audience.
create or replace function demo_private.share_owned_crew_entry(p_entry_id uuid,p_scope text)
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
    if not already_shared and rule->>'audience'='groups' then rule:=jsonb_build_object('audience','everyone','memberIds','[]'::jsonb,'groupIds','[]'::jsonb); end if;
    if rule->>'audience'='people' and jsonb_array_length(rule->'memberIds')=0 then raise exception 'Choose people in Privacy Settings before sharing' using errcode='22023'; end if;
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

notify pgrst,'reload schema';
commit;
