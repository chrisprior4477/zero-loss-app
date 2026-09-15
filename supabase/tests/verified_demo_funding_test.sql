begin;
create extension if not exists pgtap;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select ('77777777-7777-4777-8777-77777777777' || n)::uuid,'funding-'||n||'@example.test',now(),
  '{"legal_first_name":"Funding","legal_last_name":"Test","date_of_birth":"1990-01-01"}'::jsonb from generate_series(1,4) n;
update public.customers set status='active',verification_status='email_verified' where id::text like '77777777-%';
select public.start_demo_wallet_run(('77777777-7777-4777-8777-77777777777'||n)::uuid,'funding_test_run_01') from generate_series(1,4) n;
update demo_private.funding_config set enabled=true;
set local role authenticated;
set local request.jwt.claim.sub='77777777-7777-4777-8777-777777777771';
select throws_ok($$ select public.create_demo_funding_session(2500,'funding_test_key_01') $$,'42501',null,'run enrollment alone cannot fund');
select throws_ok($$ update public.demo_payment_accounts set funding_enabled=true where customer_id=auth.uid() $$,'42501',null,'customer cannot grant funding permission');
select throws_ok($$ select signing_key from demo_private.funding_config $$,'42501',null,'signing secret is not accessible');
select throws_ok($$ select * from demo_private.provider_receipts $$,'42501',null,'provider records are private');
reset role;
update public.demo_payment_accounts set funding_enabled=true where customer_id::text like '77777777-%';
set local role authenticated;
select is(public.is_demo_payment_enabled(),true,'operator-enabled account can fund');
select is(public.get_wallet_snapshot()->>'fundingAvailable','true','snapshot reports actual permission');
select set_config('test.sid',(public.create_demo_funding_session(2500,'funding_test_key_01')).id::text,true);
select is((public.create_demo_funding_session(2500,'funding_test_key_01')).id::text,current_setting('test.sid'),'same request key returns same session');
select throws_ok($$ select public.create_demo_funding_session(2600,'funding_test_key_01') $$,'22023',null,'changed amount cannot reuse key');
select is(public.get_wallet_snapshot()->>'balanceCents','0','request creation cannot credit funds');
select set_config('test.receipt',public.simulate_demo_payment(current_setting('test.sid')::uuid)::text,true);
select is(public.get_wallet_snapshot()->>'balanceCents','0','provider success is persisted separately from credit');
select is(public.get_demo_funding_requests()->0->>'reconciliation','credit_pending','reconciliation detects provider-completed/credit-missing timeout');
select is(public.simulate_demo_payment(current_setting('test.sid')::uuid)::text,current_setting('test.receipt'),'provider retry returns identical durable receipt');
select throws_ok($$ select public.accept_demo_payment_event(current_setting('test.receipt')::jsonb->>'body',repeat('0',64)) $$,'22023','Invalid payment signature','forged signature rejected');
select throws_ok($$ select public.accept_demo_payment_event(replace(current_setting('test.receipt')::jsonb->>'body','2500','9900'),current_setting('test.receipt')::jsonb->>'signature') $$,'22023','Invalid payment signature','altered amount rejected');
select throws_ok($$ select public.accept_demo_payment_event(replace(current_setting('test.receipt')::jsonb->>'body','USD','EUR'),current_setting('test.receipt')::jsonb->>'signature') $$,'22023','Invalid payment signature','altered currency rejected');
select throws_ok($$ select public.accept_demo_payment_event(repeat('x',4097),repeat('0',64)) $$,'22023',null,'oversized body rejected');
select throws_ok($$ select public.accept_demo_payment_event(null,null) $$,'22023',null,'missing event rejected');
set local request.jwt.claim.sub='77777777-7777-4777-8777-777777777772';
select throws_ok($$ select public.simulate_demo_payment(current_setting('test.sid')::uuid) $$,'42501','Funding request not found','another customer cannot retrieve receipt');
select throws_ok($$ select public.accept_demo_payment_event(current_setting('test.receipt')::jsonb->>'body',current_setting('test.receipt')::jsonb->>'signature') $$,'42501','Funding request not found','valid signature does not bypass owner authorization');
select is(public.get_demo_funding_requests(),'[]'::jsonb,'another customer sees no funding requests');
select is(public.get_wallet_snapshot()->>'balanceCents','0','another customer retains zero');
set local request.jwt.claim.sub='77777777-7777-4777-8777-777777777771';
select is(public.accept_demo_payment_event(current_setting('test.receipt')::jsonb->>'body',current_setting('test.receipt')::jsonb->>'signature')->>'duplicate','false','verified receipt posts once');
select is(public.get_wallet_snapshot()->>'balanceCents','2500','authoritative balance updates from deposit');
select is(public.get_demo_funding_requests()->0->>'reconciliation','reconciled','receipt and credit reconcile');
select is(public.accept_demo_payment_event(current_setting('test.receipt')::jsonb->>'body',current_setting('test.receipt')::jsonb->>'signature')->>'duplicate','true','replayed receipt is idempotent');
select is(public.get_wallet_snapshot()->>'balanceCents','2500','replay leaves balance unchanged');
select is(public.get_wallet_snapshot()->>'transactionCount','1','one immutable credit only');
select lives_ok($$ select public.create_demo_funding_session(100,'funding_test_key_02') $$,'second request allowed');
select lives_ok($$ select public.create_demo_funding_session(100,'funding_test_key_03') $$,'third request allowed');
select throws_ok($$ select public.create_demo_funding_session(100,'funding_test_key_04') $$,'P0001','Demo limit: three new requests per minute. Retry this request later.','fourth rapid request rejected by database');
select lives_ok($$ select public.create_demo_funding_session(2500,'funding_test_key_01') $$,'exact retry still allowed at limit');
reset role;
select is((select count(*)::integer from demo_private.provider_receipts where session_id=current_setting('test.sid')::uuid),1,'one provider payment');
select is((select count(*)::integer from demo_private.accepted_events where session_id=current_setting('test.sid')::uuid),1,'one acceptance record');
select throws_ok($$ update demo_private.provider_receipts set body='{}' where session_id=current_setting('test.sid')::uuid $$,'55000',null,'provider history immutable');
select throws_ok($$ delete from demo_private.accepted_events where session_id=current_setting('test.sid')::uuid $$,'55000',null,'acceptance history immutable');
select throws_ok($$ update public.ledger_entries set amount=5 where demo_funding_session_id=current_setting('test.sid')::uuid $$,'55000',null,'credit cannot be edited');
-- Seed old requests to exercise rolling limits without sleeping or editing history.
insert into public.demo_funding_sessions(customer_id,amount,idempotency_key,wallet_account_id,status,created_at)
select w.customer_id,100,'daily_limit_request_'||n,w.id,'declined',now()-interval '1 hour'
 from public.wallet_accounts w cross join generate_series(1,20) n where w.customer_id='77777777-7777-4777-8777-777777777772';
insert into public.demo_funding_sessions(customer_id,amount,idempotency_key,wallet_account_id,status,created_at)
select w.customer_id,50000,'total_limit_request_'||n,w.id,'declined',now()-interval '2 days'
 from public.wallet_accounts w cross join generate_series(1,2) n where w.customer_id='77777777-7777-4777-8777-777777777773';
insert into public.demo_funding_sessions(customer_id,amount,idempotency_key,wallet_account_id,status,created_at)
select w.customer_id,100,'pending_limit_request_'||n,w.id,'created',now()-interval '1 hour'
 from public.wallet_accounts w cross join generate_series(1,3) n where w.customer_id='77777777-7777-4777-8777-777777777774';
set local role authenticated;
set local request.jwt.claim.sub='77777777-7777-4777-8777-777777777772';
select throws_ok($$ select public.create_demo_funding_session(100,'daily_limit_request_21') $$,'P0001','Demo limit: twenty new requests per day.','daily count survives different request keys');
select is((select count(*)::integer from public.ledger_entries),0,'RLS hides another customer credit');
set local request.jwt.claim.sub='77777777-7777-4777-8777-777777777773';
select throws_ok($$ select public.create_demo_funding_session(100,'total_limit_request_03') $$,'P0001','Demo limit: $1,000 total requested per account.','lifetime ceiling survives rolling window');
set local request.jwt.claim.sub='77777777-7777-4777-8777-777777777774';
select throws_ok($$ select public.create_demo_funding_session(100,'pending_limit_request_04') $$,'P0001','Resolve your pending demo payments before starting another.','pending request cap enforced');
reset role;
update demo_private.funding_config set enabled=false;
set local role authenticated;
set local request.jwt.claim.sub='77777777-7777-4777-8777-777777777771';
select is(public.is_demo_payment_enabled(),false,'operator kill switch disables funding');
select throws_ok($$ select public.simulate_demo_payment(current_setting('test.sid')::uuid) $$,'42501',null,'kill switch blocks provider calls');
select throws_ok($$ select public.accept_demo_payment_event(current_setting('test.receipt')::jsonb->>'body',current_setting('test.receipt')::jsonb->>'signature') $$,'42501',null,'kill switch blocks acceptance');
select is(public.get_wallet_snapshot()->>'balanceCents','2500','funding kill switch preserves balance reads');
reset role;
update demo_private.funding_config set enabled=true;
select public.start_demo_wallet_run('77777777-7777-4777-8777-777777777771','funding_test_run_02');
set local role authenticated;
select throws_ok($$ select public.accept_demo_payment_event(current_setting('test.receipt')::jsonb->>'body',current_setting('test.receipt')::jsonb->>'signature') $$,'42501',null,'old run receipt cannot fund a new run');
select is(public.get_wallet_snapshot()->>'balanceCents','0','new run cannot inherit old credit');
set local role anon;
set local request.jwt.claim.sub='';
select throws_ok($$ select public.simulate_demo_payment(gen_random_uuid()) $$,'42501',null,'anonymous provider call denied');
select throws_ok($$ select public.accept_demo_payment_event('{}',repeat('0',64)) $$,'42501',null,'anonymous event call denied');
select throws_ok($$ select public.get_demo_funding_requests() $$,'42501',null,'anonymous reconciliation read denied');
reset role;
select * from finish();
rollback;
