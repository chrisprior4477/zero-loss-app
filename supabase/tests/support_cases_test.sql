begin;
create extension if not exists pgtap;
select no_plan();
update demo_private.funding_config set preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('61616161-6161-4161-8161-616161616161','support-one@example.test',now(),'{"legal_first_name":"Support","legal_last_name":"One","date_of_birth":"1990-01-01"}'),
 ('62626262-6262-4262-8262-626262626262','support-two@example.test',now(),'{"legal_first_name":"Support","legal_last_name":"Two","date_of_birth":"1990-01-01"}'),
 ('63636363-6363-4363-8363-636363636363','support-staff@example.test',now(),'{"legal_first_name":"Support","legal_last_name":"Staff","date_of_birth":"1990-01-01"}');
insert into public.wallet_accounts(id,customer_id,scope) values('64646464-6464-4464-8464-646464646464','62626262-6262-4262-8262-626262626262','production');
insert into public.ledger_entries(id,ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id)
 values('64646464-6464-4464-8464-646464646464','len_64646464646444648464646464646464','62626262-6262-4262-8262-626262626262','DEPOSIT','PLAYABLE',100,'USD','support_test_funding','64646464-6464-4464-8464-646464646464');
-- Legacy fixture is production-scoped initially; use a separate demo wallet
-- fixture rather than edit a posted ledger row's immutable scope.
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true where singleton;
update public.customers set status='active',verification_status='email_verified' where id in ('61616161-6161-4161-8161-616161616161','62626262-6262-4262-8262-626262626262','63636363-6363-4363-8363-636363636363');
select demo_private.ensure_preview_customer_for('61616161-6161-4161-8161-616161616161');
insert into public.ledger_entries(id,ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
 select '65656565-6565-4565-8565-656565656565','len_65656565656545658565656565656565',customer_id,'DEPOSIT','PLAYABLE',100,'USD','support_demo_test',id,'demo'
 from public.wallet_accounts where customer_id='61616161-6161-4161-8161-616161616161' and scope='demo' and closed_at is null;
create temporary table support_saved(id uuid);
grant all on support_saved to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','61616161-6161-4161-8161-616161616161',true);
select set_config('request.jwt.claims','{"sub":"61616161-6161-4161-8161-616161616161","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.has_support_access(),false,'no staff privileges by default');
insert into support_saved select public.create_support_case('65656565-6565-4565-8565-656565656565','wallet','Question about funding','Please check this sample wallet transaction.','support_create_key_one');
select is(public.create_support_case('65656565-6565-4565-8565-656565656565','wallet','Question about funding','Please check this sample wallet transaction.','support_create_key_one'),(select id from support_saved),'same key safely recovers created case');
select is((select count(*)::int from public.support_cases),1,'one case exists');
select is((select count(*)::int from public.support_case_events),1,'one opening event exists');
select is(public.get_support_case_transaction((select id from support_saved))->>'amount','100','case links exact ledger amount');
select throws_ok($$select public.create_support_case(null,'wallet','Changed subject','Please check this sample wallet transaction.','support_create_key_one')$$,'22023',null,'idempotency key cannot rewrite case identity');
select throws_ok($$select public.reply_support_case((select id from support_saved),'I declare this to be resolved.','resolved','support_illegal_resolve')$$,'42501',null,'customer cannot impersonate reviewer');
select lives_ok($$select public.reply_support_case((select id from support_saved),'Here are more details from the customer.','open','support_customer_reply')$$,'customer can add context');
select lives_ok($$select public.reply_support_case((select id from support_saved),'Here are more details from the customer.','open','support_customer_reply')$$,'reply retries do not duplicate');
select is((select count(*)::int from public.support_case_events),2,'only one new reply recorded');
select set_config('request.jwt.claim.sub','62626262-6262-4262-8262-626262626262',true);
select set_config('request.jwt.claims','{"sub":"62626262-6262-4262-8262-626262626262","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$select public.create_support_case('64646464-6464-4464-8464-646464646464','wallet','Wrong scope test','A production transaction must not enter this demo flow.','support_wrong_scope')$$,'42501',null,'production transaction cannot be attached to demo case');
select is((select count(*)::int from public.support_cases),0,'other customer cannot read cases');
select is((select count(*)::int from public.support_case_events),0,'other customer cannot read messages');
select is(public.get_support_case_transaction((select id from support_saved)),null::jsonb,'linked ledger context is private');
select throws_ok($$select public.reply_support_case((select id from support_saved),'A reply from a different account.','open','support_cross_reply')$$,'42501',null,'other customer cannot reply');
select throws_ok($$select public.create_support_case('65656565-6565-4565-8565-656565656565','wallet','Other transaction','This transaction belongs to another customer.','support_cross_create')$$,'42501',null,'cannot attach another customer transaction');
select throws_ok($$insert into public.support_cases(customer_id,category,subject,idempotency_key) values(auth.uid(),'other','Direct write','support_direct_write')$$,'42501',null,'direct case writes denied');
select throws_ok($$select * from support_private.staff_access_events$$,'42501',null,'customers cannot read or self-grant staff access');
reset role;
insert into support_private.staff_access_events(user_id,actor_id,action,reason) values('63636363-6363-4363-8363-636363636363','63636363-6363-4363-8363-636363636363','granted','Rollback-only support test grant');
set local role authenticated;
select set_config('request.jwt.claim.sub','63636363-6363-4363-8363-636363636363',true);
select set_config('request.jwt.claims','{"sub":"63636363-6363-4363-8363-636363636363","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.has_support_access(),true,'explicit staff grant enables inbox');
select is((select count(*)::int from public.support_cases where id=(select id from support_saved)),1,'staff can investigate case');
select is(public.get_support_case_transaction((select id from support_saved))->>'amount','100','staff sees only linked transaction context through Support');
select lives_ok($$select public.reply_support_case((select id from support_saved),'This is a test response; no funds were changed.','resolved','support_staff_reply')$$,'staff can reply with resolution reason');
select is((select status from public.support_cases where id=(select id from support_saved)),'resolved','case status updated');
select throws_ok($$update public.ledger_entries set amount=500$$,'42501',null,'support permission cannot adjust ledger');
select is((select count(*)::int from public.ledger_entries),0,'support permission does not reveal unrelated ledger history');
reset role;
insert into support_private.staff_access_events(user_id,actor_id,action,reason) values('63636363-6363-4363-8363-636363636363','63636363-6363-4363-8363-636363636363','revoked','Rollback-only support test revocation');
set local role authenticated;
select is(public.has_support_access(),false,'revocation takes effect immediately');
select throws_ok($$select public.reply_support_case((select id from support_saved),'Former staff must no longer reply.','open','support_revoked_reply')$$,'42501',null,'revoked staff cannot reply');
select set_config('request.jwt.claim.sub','61616161-6161-4161-8161-616161616161',true);
select set_config('request.jwt.claims','{"sub":"61616161-6161-4161-8161-616161616161","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select lives_ok($$select public.reply_support_case((select id from support_saved),'I still need help with this transaction.','open','support_reopen_reply')$$,'customer follow-up reopens resolved case');
select is((select status from public.support_cases where id=(select id from support_saved)),'open','reopened status visible');
select is((select count(*)::int from public.support_case_events),4,'complete opening, reply and resolution trail preserved');
select is(public.get_wallet_snapshot()->>'balanceCents','100','all support operations leave demo balance unchanged');
reset role;
select throws_ok($$update public.support_case_events set body='Overwritten history'$$,'55000','Financial history is append-only','even privileged edits cannot rewrite messages');
select throws_ok($$delete from public.support_cases$$,'55000','Financial history is append-only','support cases cannot be erased');
select throws_ok($$truncate support_private.staff_access_events$$,'55000','Financial history is append-only','access evidence cannot be erased');
set local role anon;
select throws_ok($$select public.create_support_case(null,'other','Anonymous request','Anonymous customers cannot access private support.','support_anon_create')$$,'42501',null,'anonymous writes denied');
reset role;
select * from finish();
rollback;
