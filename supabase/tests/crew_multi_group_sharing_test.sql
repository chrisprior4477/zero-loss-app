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
select public.save_crew_visibility_group('{"id":"ca330011-1111-4111-8111-111111111111","name":"Group one","memberIds":["ca330002-1111-4111-8111-111111111111"],"contacts":[]}',false);
select public.save_crew_visibility_group('{"id":"ca330012-1111-4111-8111-111111111111","name":"Group two","memberIds":["ca330002-1111-4111-8111-111111111111","ca330003-1111-4111-8111-111111111111"],"contacts":[]}',false);
select public.save_crew_visibility_group('{"id":"ca330013-1111-4111-8111-111111111111","name":"Empty","memberIds":[],"contacts":[]}',false);
insert into multi_group_request select public.create_preview_entries_with_sharing('multi-group-audit',1,'multi_group_rollback_entry',false);
select public.confirm_preview_entry_request((select (value->>'requestId')::uuid from multi_group_request));
select public.share_confirmed_entry_with_crew_groups((select (value->>'requestId')::uuid from multi_group_request),array['ca330013-1111-4111-8111-111111111111','ca330011-1111-4111-8111-111111111111','ca330012-1111-4111-8111-111111111111']::uuid[]);
select public.share_confirmed_entry_with_crew_groups((select (value->>'requestId')::uuid from multi_group_request),array['ca330011-1111-4111-8111-111111111111','ca330012-1111-4111-8111-111111111111']::uuid[]);
do $$ declare saved_entry_id uuid; rule jsonb; begin
 select id into saved_entry_id from public.customer_entries where customer_id=auth.uid() and entry_request_id=(select (value->>'requestId')::uuid from multi_group_request);
 select entry_rules->saved_entry_id::text into rule from public.crew_visibility_settings where owner_id=auth.uid();
 assert rule->>'audience'='groups' and jsonb_array_length(rule->'groupIds')=2,'both groups retained';
 assert (select count(*)=1 from public.crew_entry_shares where owner_id=auth.uid() and crew_entry_shares.entry_id=saved_entry_id),'retry retains one share flag';
 perform set_config('test.multi_entry',saved_entry_id::text,true);
 begin perform public.share_confirmed_entry_with_crew_groups((select (value->>'requestId')::uuid from multi_group_request),array['ca330099-1111-4111-8111-111111111111']::uuid[]); raise exception 'Unknown group accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.share_confirmed_entry_with_crew_groups((select (value->>'requestId')::uuid from multi_group_request),array['ca330011-1111-4111-8111-111111111111','ca330011-1111-4111-8111-111111111111']::uuid[]); raise exception 'Duplicate group accepted'; exception when invalid_parameter_value then null; end;
end $$;
set local request.jwt.claim.sub='ca330002-1111-4111-8111-111111111111';
do $$ begin assert public.crew_can_view_shared_entry('ca330001-1111-4111-8111-111111111111',current_setting('test.multi_entry')::uuid),'first group member has access'; end $$;
set local request.jwt.claim.sub='ca330003-1111-4111-8111-111111111111';
do $$ begin assert public.crew_can_view_shared_entry('ca330001-1111-4111-8111-111111111111',current_setting('test.multi_entry')::uuid),'second group member has access'; end $$;
set local request.jwt.claim.sub='ca330004-1111-4111-8111-111111111111';
do $$ begin
 assert not public.crew_can_view_shared_entry('ca330001-1111-4111-8111-111111111111',current_setting('test.multi_entry')::uuid),'outsider denied';
 begin perform public.share_confirmed_entry_with_crew_groups((select (value->>'requestId')::uuid from multi_group_request),array['ca330011-1111-4111-8111-111111111111']::uuid[]); raise exception 'Other owner accepted'; exception when invalid_parameter_value or insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 begin perform public.share_confirmed_entry_with_crew_groups(gen_random_uuid(),array['ca330011-1111-4111-8111-111111111111']::uuid[]); raise exception 'Anonymous share accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: multi-group access, overlapping recipients, empty groups, retries and owner isolation; fixtures rolled back' as result;
