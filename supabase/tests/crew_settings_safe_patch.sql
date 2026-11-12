-- Isolated fixture regression check; every data change rolls back.
begin;
set local statement_timeout='15s';
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,preview_entries_enabled=true,
 entry_undo_required=true,preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('cb110001-1111-4111-8111-111111111111','crew-safe-patch@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Fixture","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id='cb110001-1111-4111-8111-111111111111';
select demo_private.ensure_preview_customer_for('cb110001-1111-4111-8111-111111111111');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
 select 'len_'||replace(gen_random_uuid()::text,'-',''),customer_id,'DEPOSIT','PLAYABLE',10000,'USD','crew_safe_patch_rollback_fixture',id,'demo'
 from public.wallet_accounts where customer_id='cb110001-1111-4111-8111-111111111111' and scope='demo' and closed_at is null;
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries)
 values('crew-safe-patch','Crew test','Test','Test','/test.png',2500,100,50,0);
insert into public.crew_visibility_settings(owner_id) values('cb110001-1111-4111-8111-111111111111');
set local role authenticated;
set local request.jwt.claim.sub='cb110001-1111-4111-8111-111111111111';
select set_config('request.jwt.claims','{"sub":"cb110001-1111-4111-8111-111111111111","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
do $$
declare
  baseline jsonb; desired jsonb; saved jsonb; stale jsonb;
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); entry uuid;
  passed integer:=0;
begin
  saved:=public.create_preview_entries_with_sharing('crew-safe-patch',1,'crew_safe_patch_rollback_entry',false);
  perform public.confirm_preview_entry_request((saved->>'requestId')::uuid);
  select jsonb_build_object('defaultRule',s.default_rule,'groups',s.groups,'entryRules',s.entry_rules,'discoverable',p.crew_discoverable,
    'discovery',jsonb_build_object('real',p.crew_find_real_name,'email',p.crew_find_email,'phone',p.crew_find_phone)) into strict baseline
    from public.crew_visibility_settings s join public.customer_profiles p on p.customer_id=s.owner_id where s.owner_id=auth.uid();
  perform public.save_crew_group_checked(jsonb_build_object('id',a,'name','Safe patch test A','memberIds','[]'::jsonb,'contacts','[]'::jsonb),false,null);
  desired:=jsonb_set(baseline,'{discovery,email}',to_jsonb(not (baseline#>>'{discovery,email}')::boolean));
  saved:=public.patch_crew_display_preferences(baseline,desired);
  if not exists(select 1 from jsonb_array_elements(saved->'groups') g where g->>'id'=a::text) then raise exception 'New group was overwritten'; end if;
  if saved#>'{discovery,email}' is distinct from desired#>'{discovery,email}' then raise exception 'Privacy choice was not saved'; end if;
  passed:=passed+1;
  -- Retrying the identical draft must be safe.
  perform public.patch_crew_display_preferences(baseline,desired);
  passed:=passed+1;

  perform public.save_crew_group_checked(jsonb_build_object('id',b,'name','Safe patch test B','memberIds','[]'::jsonb,'contacts','[]'::jsonb),false,null);
  select id into strict entry from public.customer_entries where customer_id=auth.uid() order by created_at desc limit 1;
  stale:=saved;
  select groups into saved from public.crew_visibility_settings where owner_id=auth.uid();
  stale:=jsonb_set(stale,'{groups}',saved);
  desired:=jsonb_set(stale,array['entryRules',entry::text],jsonb_build_object('audience','groups','memberIds','[]'::jsonb,'groupIds',jsonb_build_array(a,b)));
  stale:=public.patch_crew_display_preferences(stale,desired);
  perform public.share_owned_crew_entry(entry,a::text);
  perform public.share_owned_crew_entry(entry,b::text);
  perform public.cleanup_crew_shares(gen_random_uuid(),a::text,null,entry,null);
  desired:=jsonb_set(stale,'{discovery,phone}',to_jsonb(not (stale#>>'{discovery,phone}')::boolean));
  saved:=public.patch_crew_display_preferences(stale,desired);
  if saved->'entryRules'->entry::text->'groupIds' ? a::text then raise exception 'Cleanup was reversed'; end if;
  if not (saved->'entryRules'->entry::text->'groupIds' ? b::text) then raise exception 'Other audience was lost'; end if;
  passed:=passed+1;
  -- Explicitly editing the same pick from the older snapshot must conflict.
  desired:=jsonb_set(stale,array['entryRules',entry::text],'{"audience":"everyone","memberIds":[],"groupIds":[]}'::jsonb);
  begin
    perform public.patch_crew_display_preferences(stale,desired);
    raise exception 'Conflicting audience was accepted';
  exception when sqlstate 'PT409' then passed:=passed+1; end;
  -- A newer rename cannot be overwritten by an older group editor in this form.
  stale:=saved;
  perform public.save_crew_group_checked(jsonb_build_object('id',a,'name','Newer group name','memberIds','[]'::jsonb,'contacts','[]'::jsonb),false,(select g from jsonb_array_elements(stale->'groups') g where g->>'id'=a::text));
  select jsonb_set(stale,'{groups}',jsonb_agg(case when g->>'id'=a::text then jsonb_set(g,'{name}','"Older editor name"') else g end)) into desired from jsonb_array_elements(stale->'groups') g;
  begin
    perform public.patch_crew_display_preferences(stale,desired);
    raise exception 'Conflicting group was accepted';
  exception when sqlstate 'PT409' then passed:=passed+1; end;
  -- An older deployed action must not restore an unsafe full snapshot.
  begin
    perform public.save_crew_display_preferences(stale->'defaultRule',stale->'groups',stale->'entryRules',true,true,true,true);
    raise exception 'Legacy overwrite was accepted';
  exception when serialization_failure then passed:=passed+1; end;
  -- Existing ownership validation still rejects another account's entry.
  desired:=jsonb_set(saved,array['entryRules',gen_random_uuid()::text],'{"audience":"everyone","memberIds":[],"groupIds":[]}'::jsonb);
  begin
    perform public.patch_crew_display_preferences(saved,desired);
    raise exception 'Foreign entry was accepted';
  exception when insufficient_privilege then passed:=passed+1; end;
  perform set_config('audit.safe_patch_result',jsonb_build_object('checksPassed',passed,'newGroupPreserved',true,'cleanupPreserved',true,'conflictingEditsRejected',true,'legacyOverwriteBlocked',true,'ownershipChecked',true)::text,true);
end $$;
reset role;
-- Simulate a long-lived cleanup history without creating hundreds of entries.
update public.crew_visibility_settings
set entry_rules = entry_rules || (
  select jsonb_object_agg('cb120001-1111-4111-8111-' || lpad(i::text, 12, '0'),
    '{"audience":"groups","memberIds":[],"groupIds":[]}'::jsonb)
  from generate_series(1, 501) i
)
where owner_id = auth.uid();
set local role authenticated;
do $$
declare
  before_save jsonb;
  after_save jsonb;
  draft jsonb;
  saved_rules jsonb;
  owned_entry text;
begin
  select jsonb_build_object('defaultRule',s.default_rule,'entryRules','{}'::jsonb,'discoverable',p.crew_discoverable,
    'discovery',jsonb_build_object('real',p.crew_find_real_name,'email',p.crew_find_email,'phone',p.crew_find_phone)), s.entry_rules
  into strict before_save, saved_rules
  from public.crew_visibility_settings s join public.customer_profiles p on p.customer_id=s.owner_id where s.owner_id=auth.uid();
  assert (select count(*) from jsonb_object_keys(saved_rules)) = 502, 'Expected a large cleanup history';
  draft := jsonb_set(before_save, '{discovery,real}', to_jsonb(not (before_save#>>'{discovery,real}')::boolean));
  after_save := public.patch_crew_display_preferences(before_save, draft);
  assert after_save->'entryRules' = saved_rules, 'Privacy-only save retains all historical rules';
  assert after_save#>'{discovery,real}' = draft#>'{discovery,real}', 'Discovery change is saved';

  -- Legacy callers that send their whole unchanged history remain compatible.
  before_save := after_save;
  draft := jsonb_set(before_save, '{discovery,phone}', to_jsonb(not (before_save#>>'{discovery,phone}')::boolean));
  after_save := public.patch_crew_display_preferences(before_save, draft);
  assert after_save->'entryRules' = saved_rules, 'Full legacy snapshots preserve history too';
  assert after_save#>'{discovery,phone}' = draft#>'{discovery,phone}', 'Legacy discovery change is saved';

  select id::text into strict owned_entry from public.customer_entries where customer_id=auth.uid();
  before_save := jsonb_set(after_save - 'groups', '{entryRules}', jsonb_build_object(owned_entry, saved_rules->owned_entry));
  draft := jsonb_set(before_save, '{entryRules}', '{}'::jsonb);
  after_save := public.patch_crew_display_preferences(before_save, draft);
  assert after_save->'entryRules' = saved_rules - owned_entry, 'One edited pick can return to the default';
end $$;
select current_setting('audit.safe_patch_result')::jsonb as rollback_test;
rollback;
