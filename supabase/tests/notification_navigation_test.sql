-- Rollback-only fixtures: no customer data, balances or read receipts survive.
begin;
create extension if not exists pgtap;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('75100111-1111-4111-8111-111111111111','notification-a@example.test',now(),'{"legal_first_name":"Navigation","legal_last_name":"A","date_of_birth":"1990-01-01"}'),
('75100222-2222-4222-8222-222222222222','notification-b@example.test',now(),'{"legal_first_name":"Navigation","legal_last_name":"B","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified'
where id in ('75100111-1111-4111-8111-111111111111','75100222-2222-4222-8222-222222222222');
set local role service_role;
select set_config('test.notification_wallet',public.start_demo_wallet_run('75100111-1111-4111-8111-111111111111','notification_navigation_run')::text,true);
reset role;
insert into public.ledger_entries(id,ledger_entry_id,customer_id,entry_type,balance_type,amount,source_event,wallet_account_id,wallet_scope,created_at)
select ('75100333-3333-4333-8333-'||lpad(i::text,12,'0'))::uuid,'len_'||md5('notification_fixture_'||i),
  '75100111-1111-4111-8111-111111111111','DEPOSIT','PLAYABLE',100,'notification_fixture_'||i,
  current_setting('test.notification_wallet')::uuid,'demo',now()-(60-i)*interval '1 minute'
from generate_series(1,51) i;
select ok((select relrowsecurity from pg_class where oid='public.customer_notification_reads'::regclass),'read receipts enforce RLS');
select ok(not has_table_privilege('anon','public.customer_notification_reads','select'),'anonymous visitors cannot read receipts');
select ok(not has_table_privilege('authenticated','public.customer_notification_reads','update'),'customers cannot overwrite receipt history');
select ok(not has_table_privilege('authenticated','public.customer_notification_reads','delete'),'customers cannot delete receipt history');
set local role authenticated;
set local request.jwt.claim.sub='75100111-1111-4111-8111-111111111111';
set local request.jwt.claims='{"sub":"75100111-1111-4111-8111-111111111111","role":"authenticated"}';
select lives_ok($$insert into public.customer_notification_reads(customer_id,notification_id) values(auth.uid(),'reward-notification-fixture') on conflict(customer_id,notification_id) do nothing$$,'owner can save a read receipt');
select lives_ok($$insert into public.customer_notification_reads(customer_id,notification_id) values(auth.uid(),'reward-notification-fixture') on conflict(customer_id,notification_id) do nothing$$,'retry is idempotent with insert/select privileges only');
select is((select count(*)::int from public.customer_notification_reads),1,'retry leaves one saved receipt');
select throws_ok($$insert into public.customer_notification_reads(customer_id,notification_id) values('75100222-2222-4222-8222-222222222222','forged')$$,'42501',null,'owner cannot mark another customer notifications read');
select is(jsonb_array_length(public.get_wallet_snapshot()->'entries'),50,'recent snapshot remains capped at fifty');
select ok(not exists(select 1 from jsonb_array_elements(public.get_wallet_snapshot()->'entries') e where e->>'id'='75100333-3333-4333-8333-000000000001'),'oldest transaction is outside the recent snapshot');
select is((select amount from public.ledger_entries where customer_id=auth.uid() and id='75100333-3333-4333-8333-000000000001'),100,'exact owner read can still retrieve the older transaction');
select lives_ok($$select id,entry_type,amount,created_at from public.ledger_entries where customer_id=auth.uid() and id='75100333-3333-4333-8333-000000000001'$$,'deep link reads only permitted Ledger columns');
set local request.jwt.claim.sub='75100222-2222-4222-8222-222222222222';
set local request.jwt.claims='{"sub":"75100222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*)::int from public.customer_notification_reads),0,'another customer cannot see saved receipt identities');
select is((select count(id)::int from public.ledger_entries where id='75100333-3333-4333-8333-000000000001'),0,'guessing a transaction UUID does not reveal its owner ledger');
select lives_ok($$insert into public.customer_notification_reads(customer_id,notification_id) values(auth.uid(),'reward-notification-fixture') on conflict(customer_id,notification_id) do nothing$$,'same notification key remains independent for another customer');
set local request.jwt.claim.sub='75100111-1111-4111-8111-111111111111';
set local request.jwt.claims='{"sub":"75100111-1111-4111-8111-111111111111","role":"authenticated"}';
select is((select count(*)::int from public.customer_notification_reads),1,'reopening the account still reads its persisted receipt');
select lives_ok($$insert into public.customer_notification_reads(customer_id,notification_id) values(auth.uid(),'reward-notification-fixture-expired') on conflict(customer_id,notification_id) do nothing$$,'changed reward state has a separate receipt');
select is((select count(*)::int from public.customer_notification_reads),2,'old and new status receipts both remain in history');
select * from finish();
rollback;
