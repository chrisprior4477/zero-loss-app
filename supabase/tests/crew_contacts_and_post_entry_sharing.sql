begin;
-- Every fixture and assertion is rolled back; no messages are sent.
create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'Assertion failed: %', message; end if; end; $$;
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlstate = expected then return; end if;
    raise exception 'Expected %, got %: %', expected, sqlstate, sqlerrm;
  end;
  raise exception 'Expected error %, statement succeeded', expected;
end; $$;
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,preview_entries_enabled=true,
 entry_undo_required=true,preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('ca110001-1111-4111-8111-111111111111','crew-contact-owner@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Fixture","date_of_birth":"1990-01-01"}'),
 ('ca110002-1111-4111-8111-111111111111','crew-contact-member@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Member","date_of_birth":"1990-01-01"}'),
 ('ca110003-1111-4111-8111-111111111111','crew-contact-outsider@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Outsider","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id::text like 'ca11000%';
select demo_private.ensure_preview_customer_for('ca110001-1111-4111-8111-111111111111');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
 select 'len_'||replace(gen_random_uuid()::text,'-',''),customer_id,'DEPOSIT','PLAYABLE',10000,'USD','crew_contacts_rollback_fixture',id,'demo'
 from public.wallet_accounts where customer_id='ca110001-1111-4111-8111-111111111111' and scope='demo' and closed_at is null;
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries)
 values('crew-contact-audit','Crew test','Test','Test','/test.png',2500,100,50,0);
insert into public.crew_invitations(requester_id,recipient_id,requester_name,recipient_name,status,responded_at)
 values ('ca110001-1111-4111-8111-111111111111','ca110002-1111-4111-8111-111111111111','Fixture','Member','accepted',now());
create temporary table crew_test(value jsonb);
grant all on crew_test to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','ca110001-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"ca110001-1111-4111-8111-111111111111","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select public.save_crew_visibility_group('{"id":"ca110004-1111-4111-8111-111111111111","name":"Mom fixture","memberIds":[],"contacts":[{"id":"ca110005-1111-4111-8111-111111111111","name":"Contact only","phone":"+1 (202) 555-0123","email":"contact@example.test"}]}',false);
select pg_temp.assert_true((select groups->0->'contacts'->0->>'name'='Contact only' from public.crew_visibility_settings),'single-group save persists contacts');
select pg_temp.assert_true((select groups->0->'memberIds'='[]'::jsonb from public.crew_visibility_settings),'contact does not become a member');
select public.save_crew_visibility_settings('{"audience":"everyone","memberIds":[],"groupIds":[]}',(select groups from public.crew_visibility_settings),'{}',false);
select pg_temp.assert_true((select jsonb_array_length(groups->0->'contacts')=1 from public.crew_visibility_settings),'profile save preserves contacts');
select pg_temp.expect_error($q$select public.save_crew_visibility_group('{"id":"ca110004-1111-4111-8111-111111111111","name":"Bad","memberIds":[],"contacts":[{"id":"bad","name":"Invalid","phone":"","email":""}]}',false)$q$,'23514');
insert into crew_test select public.create_preview_entries_with_sharing('crew-contact-audit',1,'crew_contact_rollback_entry',false);
select pg_temp.expect_error(format('select public.share_confirmed_entry_with_crew(%L,null)',(select value->>'requestId' from crew_test)),'42501');
select public.confirm_preview_entry_request((select (value->>'requestId')::uuid from crew_test));
select pg_temp.assert_true((select count(*)=0 from public.crew_entry_shares),'confirmed private entry remains private');
select pg_temp.expect_error(format('select public.share_confirmed_entry_with_crew(%L,%L)',(select value->>'requestId' from crew_test),'ca110004-1111-4111-8111-111111111111'),'22023');
select pg_temp.assert_true((select count(*)=0 from public.crew_entry_shares),'contact-only group cannot expose entry');
select public.save_crew_visibility_group((select jsonb_set(groups->0,'{memberIds}','["ca110002-1111-4111-8111-111111111111"]') from public.crew_visibility_settings),false);
select pg_temp.assert_true(public.share_confirmed_entry_with_crew((select (value->>'requestId')::uuid from crew_test),'ca110004-1111-4111-8111-111111111111')=1,'share with approved group');
select pg_temp.assert_true(public.share_confirmed_entry_with_crew((select (value->>'requestId')::uuid from crew_test),'ca110004-1111-4111-8111-111111111111')=1,'sharing retry is idempotent');
select pg_temp.assert_true((select count(*)=1 from public.crew_entry_shares),'one share after retry');
select pg_temp.assert_true((select entry_rules->(select id::text from public.customer_entries)->>'audience'='groups' from public.crew_visibility_settings),'group audience overrides broad default atomically');
select pg_temp.assert_true(public.get_wallet_snapshot()->>'balanceCents'='9900','sharing does not charge wallet');
select set_config('request.jwt.claim.sub','ca110003-1111-4111-8111-111111111111',true);
select pg_temp.assert_true((select count(*)=0 from public.crew_visibility_settings),'other accounts cannot read saved contacts');
select pg_temp.assert_true((select count(*)=0 from public.crew_entry_shares),'outsiders cannot see shares');
select pg_temp.expect_error(format('select public.share_confirmed_entry_with_crew(%L,null)',(select value->>'requestId' from crew_test)),'42501');
reset role;
insert into public.crew_invitations(requester_id,recipient_id,requester_name,recipient_name,status,responded_at)
 values ('ca110001-1111-4111-8111-111111111111','ca110003-1111-4111-8111-111111111111','Fixture','Outside group','accepted',now());
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.crew_entry_shares),'approved Crew outside the chosen group cannot see share');
select set_config('request.jwt.claim.sub','ca110002-1111-4111-8111-111111111111',true);
select pg_temp.assert_true((select count(*)=0 from public.crew_visibility_settings),'approved members cannot read contact address book');
select pg_temp.assert_true((select count(*)=1 from public.crew_entry_shares),'approved group member can see share');
reset role;
set local role anon;
select pg_temp.expect_error($q$select public.share_confirmed_entry_with_crew('ca110004-1111-4111-8111-111111111111',null)$q$,'42501');
reset role;
select 'Crew contact persistence, validation, private-by-default sharing, idempotency and owner isolation passed' as result;
rollback;
