begin;
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,preview_entries_enabled=true,
 entry_undo_required=true,preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('ca330001-1111-4111-8111-111111111111','multi-group-owner@example.test',now(),'{"legal_first_name":"Multi","legal_last_name":"Owner","date_of_birth":"1990-01-01"}'),
('ca330002-1111-4111-8111-111111111111','multi-group-one@example.test',now(),'{"legal_first_name":"Multi","legal_last_name":"One","date_of_birth":"1990-01-01"}'),
('ca330003-1111-4111-8111-111111111111','multi-group-two@example.test',now(),'{"legal_first_name":"Multi","legal_last_name":"Two","date_of_birth":"1990-01-01"}'),
('ca330004-1111-4111-8111-111111111111','multi-group-outside@example.test',now(),'{"legal_first_name":"Multi","legal_last_name":"Outside","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id::text like 'ca33000%';
select demo_private.ensure_preview_customer_for('ca330001-1111-4111-8111-111111111111');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
 select 'len_'||replace(gen_random_uuid()::text,'-',''),customer_id,'DEPOSIT','PLAYABLE',10000,'USD','multi_groups_rollback_fixture',id,'demo'
 from public.wallet_accounts where customer_id='ca330001-1111-4111-8111-111111111111' and scope='demo' and closed_at is null;
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries)
 values('multi-group-audit','Multi-group test','Test','Test','/test.png',2500,100,50,0);
insert into public.crew_invitations(requester_id,recipient_id,requester_name,recipient_name,status,responded_at) values
('ca330001-1111-4111-8111-111111111111','ca330002-1111-4111-8111-111111111111','Owner','One','accepted',now()),
('ca330001-1111-4111-8111-111111111111','ca330003-1111-4111-8111-111111111111','Owner','Two','accepted',now());
create temporary table multi_group_request(value jsonb);
grant all on multi_group_request to authenticated;
set local role authenticated;
set local request.jwt.claim.sub='ca330001-1111-4111-8111-111111111111';
select set_config('request.jwt.claims','{"sub":"ca330001-1111-4111-8111-111111111111","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select public.save_crew_group_checked('{"id":"ca330011-1111-4111-8111-111111111111","name":"Group one","memberIds":["ca330002-1111-4111-8111-111111111111"],"contacts":[]}',false,null);
select public.save_crew_group_checked('{"id":"ca330012-1111-4111-8111-111111111111","name":"Group two","memberIds":["ca330002-1111-4111-8111-111111111111","ca330003-1111-4111-8111-111111111111"],"contacts":[]}',false,null);
select public.save_crew_group_checked('{"id":"ca330013-1111-4111-8111-111111111111","name":"Empty","memberIds":[],"contacts":[]}',false,null);
insert into multi_group_request select public.create_preview_entries_with_sharing('multi-group-audit',1,'multi_group_rollback_entry',false);
select public.confirm_preview_entry_request((select (value->>'requestId')::uuid from multi_group_request));
select public.share_confirmed_entry_with_crew_groups((select (value->>'requestId')::uuid from multi_group_request),array['ca330013-1111-4111-8111-111111111111','ca330011-1111-4111-8111-111111111111','ca330012-1111-4111-8111-111111111111']::uuid[]);
select public.share_confirmed_entry_with_crew_groups((select (value->>'requestId')::uuid from multi_group_request),array['ca330011-1111-4111-8111-111111111111','ca330012-1111-4111-8111-111111111111']::uuid[]);

reset role;
select set_config('test.cleanup_entry',(select id::text from public.customer_entries where customer_id='ca330001-1111-4111-8111-111111111111' and entry_request_id=(select (value->>'requestId')::uuid from multi_group_request)),true);
update public.crew_entry_shares set created_at=now()-interval '100 days' where entry_id=current_setting('test.cleanup_entry')::uuid;
set local role authenticated;
select public.cleanup_crew_shares('cc660001-1111-4111-8111-111111111111','ca330012-1111-4111-8111-111111111111',null,current_setting('test.cleanup_entry')::uuid,now()-interval '30 days');
set local request.jwt.claim.sub='ca330002-1111-4111-8111-111111111111';
do $$ begin assert public.crew_can_view_shared_entry('ca330001-1111-4111-8111-111111111111',current_setting('test.cleanup_entry')::uuid),'overlapping first-group audience preserved'; end $$;
set local request.jwt.claim.sub='ca330003-1111-4111-8111-111111111111';
do $$ begin assert not public.crew_can_view_shared_entry('ca330001-1111-4111-8111-111111111111',current_setting('test.cleanup_entry')::uuid),'removed group has no entry access'; end $$;
set local request.jwt.claim.sub='ca330004-1111-4111-8111-111111111111';
do $$ begin
 begin perform public.undo_crew_share_cleanup('cc660001-1111-4111-8111-111111111111'); raise exception 'Another owner can undo'; exception when insufficient_privilege then null; end;
 begin perform public.share_owned_crew_entry(current_setting('test.cleanup_entry')::uuid,'crew'); raise exception 'Another owner can share'; exception when insufficient_privilege then null; end;
 begin perform public.cleanup_crew_shares('cc660002-1111-4111-8111-111111111111','crew',null,current_setting('test.cleanup_entry')::uuid,null); raise exception 'Another owner can clean'; exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub='ca330001-1111-4111-8111-111111111111';
do $$ declare r jsonb; e uuid:=current_setting('test.cleanup_entry')::uuid; begin
 r:=public.cleanup_crew_shares('cc660001-1111-4111-8111-111111111111','ca330012-1111-4111-8111-111111111111',null,e,now()-interval '30 days');
 assert (r->>'count')::int=1,'retry returns original result';
 perform public.undo_crew_share_cleanup('cc660001-1111-4111-8111-111111111111');
 perform public.undo_crew_share_cleanup('cc660001-1111-4111-8111-111111111111');
 assert (select jsonb_array_length(entry_rules->e::text->'groupIds')=2 from public.crew_visibility_settings where owner_id=auth.uid()),'undo restores both groups';
 r:=public.cleanup_crew_shares('cc660002-1111-4111-8111-111111111111','ca330011-1111-4111-8111-111111111111',null,e,now()-interval '180 days');
 assert (r->>'count')::int=0,'recent shares excluded by cutoff';
 perform public.cleanup_crew_shares('cc660003-1111-4111-8111-111111111111','ca330011-1111-4111-8111-111111111111',null,e,null);
 perform public.cleanup_crew_shares('cc660004-1111-4111-8111-111111111111','ca330012-1111-4111-8111-111111111111',null,e,null);
 assert not exists(select 1 from public.crew_entry_shares where entry_id=e),'last audience stops sharing';
 begin perform public.undo_crew_share_cleanup('cc660003-1111-4111-8111-111111111111'); raise exception 'Stale undo broadened access'; exception when serialization_failure then null; end;
 perform public.undo_crew_share_cleanup('cc660004-1111-4111-8111-111111111111');
 perform public.undo_crew_share_cleanup('cc660003-1111-4111-8111-111111111111');
 assert (select created_at=now()-interval '100 days' from public.crew_entry_shares where entry_id=e),'undo retains original share age';
end $$;
-- A private pick shared again must retain its selected people, not widen to all Crew.
reset role;
update public.crew_visibility_settings set entry_rules=jsonb_set(entry_rules,array[current_setting('test.cleanup_entry')],
 '{"audience":"people","memberIds":["ca330002-1111-4111-8111-111111111111"],"groupIds":[]}'::jsonb)
 where owner_id='ca330001-1111-4111-8111-111111111111';
set local role authenticated;
select public.cleanup_crew_shares('cc660005-1111-4111-8111-111111111111','crew',null,current_setting('test.cleanup_entry')::uuid,null);
select public.share_owned_crew_entry(current_setting('test.cleanup_entry')::uuid,'crew');
set local request.jwt.claim.sub='ca330002-1111-4111-8111-111111111111';
do $$ begin assert public.crew_can_view_shared_entry('ca330001-1111-4111-8111-111111111111',current_setting('test.cleanup_entry')::uuid),'selected person sees reshared pick'; end $$;
set local request.jwt.claim.sub='ca330003-1111-4111-8111-111111111111';
do $$ begin assert not public.crew_can_view_shared_entry('ca330001-1111-4111-8111-111111111111',current_setting('test.cleanup_entry')::uuid),'resharing does not widen the audience'; end $$;
set local role anon;
do $$ begin
 begin perform public.cleanup_crew_shares(gen_random_uuid(),'crew'); raise exception 'Anonymous cleanup accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: cleanup scopes, recipient permissions, age filters, idempotency, Undo, concurrency and owner isolation; fixtures rolled back' as result;
