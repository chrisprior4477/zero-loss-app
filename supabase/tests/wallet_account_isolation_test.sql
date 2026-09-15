-- Checkpoint 1 tests. All fixture writes roll back; these are NOT funding events.
begin;
create extension if not exists pgtap;
select no_plan();

insert into auth.users(id, email, raw_user_meta_data) values
('33333333-3333-4333-8333-333333333333', 'wallet-a@example.test', '{"legal_first_name":"Wallet","legal_last_name":"A","date_of_birth":"1990-01-01"}'),
('44444444-4444-4444-8444-444444444444', 'wallet-b@example.test', '{"legal_first_name":"Wallet","legal_last_name":"B","date_of_birth":"1990-01-01"}'),
('55555555-5555-4555-8555-555555555555', 'wallet-c@example.test', '{"legal_first_name":"Wallet","legal_last_name":"C","date_of_birth":"1990-01-01"}');
update public.customers set status = 'active', verification_status = 'email_verified'
where id in ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555');
update auth.users set email_confirmed_at = now() where id in
  ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555');

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
set local request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';
select is(current_user::text, 'authenticated', 'tests exercise the client role');
select is(auth.uid(), '33333333-3333-4333-8333-333333333333'::uuid, 'tests have the expected authenticated identity');
select is(public.get_wallet_snapshot()->>'scope', 'production', 'ordinary account defaults to production');
select is(public.get_wallet_snapshot()->>'balanceCents', '0', 'fresh account has zero balance');
select is(public.get_wallet_snapshot()->>'transactionCount', '0', 'fresh account has no activity');
select is(public.get_wallet_snapshot()->'entries', '[]'::jsonb, 'fresh history is empty');
select throws_ok($$ select public.create_demo_funding_session(2500, 'test_funding_0001') $$,
  '42501', 'Demo funding is not enabled for this account', 'ordinary customer cannot create simulated funds');
select throws_ok($$ select public.start_demo_wallet_run(auth.uid(), 'test_run_key_0001') $$,
  '42501', null, 'customer cannot enroll themselves or reset a demo run');
select throws_ok($$ select public.complete_demo_funding_session(gen_random_uuid()) $$,
  '42501', null, 'customer cannot post a credit through the retired prototype');
select throws_ok($$ insert into public.demo_payment_accounts(customer_id,enabled) values(auth.uid(),true) $$,
  '42501', null, 'customer cannot self-allowlist');
select throws_ok($$ select id from public.wallet_accounts $$,
  '42501', null, 'internal wallet identities are not exposed as an unrestricted table');

set local role service_role;
select set_config('test.wallet_a', public.start_demo_wallet_run('33333333-3333-4333-8333-333333333333','test_run_key_0001')::text, true);
select is(public.start_demo_wallet_run('33333333-3333-4333-8333-333333333333','test_run_key_0001')::text,
  current_setting('test.wallet_a'), 'operator retry returns the same run');
select throws_ok($$ select public.complete_demo_funding_session(gen_random_uuid()) $$,
  '42501', null, 'even the service key cannot use the retired completion function');
select throws_ok($$ insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,source_event,wallet_account_id,wallet_scope)
  values('len_1234', '33333333-3333-4333-8333-333333333333','DEPOSIT','PLAYABLE',2500,'unsafe',current_setting('test.wallet_a')::uuid,'demo') $$,
  '42501', null, 'application services must post through a permitted function, not direct table inserts');

set local role authenticated;
select is(public.get_wallet_snapshot()->>'scope', 'demo', 'server enrollment determines demo scope');
select is(public.get_wallet_snapshot()->>'balanceCents', '0', 'new demo run starts at zero');
select is(public.get_wallet_snapshot()->>'fundingAvailable', 'false', 'wallet enrollment alone does not grant funding');
reset role;
-- Checkpoint-two operator permissions, only for this rolled-back test fixture.
update demo_private.funding_config set enabled = true;
update public.demo_payment_accounts set funding_enabled = true where customer_id = '33333333-3333-4333-8333-333333333333';
set local role authenticated;
select set_config('test.session_a', (public.create_demo_funding_session(2500, 'test_funding_0001')).id::text, true);
select is((public.create_demo_funding_session(2500, 'test_funding_0001')).id::text,
  current_setting('test.session_a'), 'retry creates only one funding session');
select throws_ok($$ select public.create_demo_funding_session(5000, 'test_funding_0001') $$,
  '22023', 'Idempotency key belongs to a different funding request', 'retry cannot silently change the amount');
select throws_ok($$ select public.create_demo_funding_session(null, 'test_funding_0002') $$,
  '22023', null, 'null amount rejected');
select throws_ok($$ select public.create_demo_funding_session(99, 'test_funding_0002') $$,
  '22023', null, 'amount below minimum rejected');
select throws_ok($$ select public.create_demo_funding_session(50001, 'test_funding_0002') $$,
  '22023', null, 'amount above maximum rejected');
select throws_ok($$ select public.create_demo_funding_session(2500, null) $$,
  '22023', null, 'null request key rejected');
select throws_ok($$ select public.create_demo_funding_session(2500, 'short') $$,
  '22023', null, 'malformed request key rejected');
select is(public.get_wallet_snapshot()->>'balanceCents', '0', 'creating a request does not credit the ledger');

reset role;
select is((select count(*)::int from public.demo_funding_sessions where customer_id = '33333333-3333-4333-8333-333333333333'),
  1, 'exactly one request persisted after retries and rejected changes');
select throws_ok($$ update public.demo_funding_sessions set amount = 9999 where id = current_setting('test.session_a')::uuid $$,
  '55000', 'Funding session identity and amount are immutable', 'even an owner-level edit cannot change the recorded request amount');

-- Explicit test fixture postings: use database owner, never a browser or service key.
insert into public.ledger_entries(ledger_entry_id, customer_id, entry_type, balance_type, amount, source_event, wallet_account_id, wallet_scope)
values ('len_aaaa', '33333333-3333-4333-8333-333333333333', 'DEPOSIT','PLAYABLE',2500,'fixture_deposit_a',current_setting('test.wallet_a')::uuid,'demo');

select set_config('test.wallet_b', gen_random_uuid()::text, true);
insert into public.wallet_accounts(id, customer_id, scope)
values(current_setting('test.wallet_b')::uuid,'44444444-4444-4444-8444-444444444444','production');
insert into public.ledger_entries(ledger_entry_id, customer_id, entry_type, balance_type, amount, source_event, wallet_account_id)
values ('len_bbbb', '44444444-4444-4444-8444-444444444444', 'DEPOSIT','PLAYABLE',9900,'fixture_deposit_b',current_setting('test.wallet_b')::uuid);
select throws_ok($$ select public.start_demo_wallet_run('44444444-4444-4444-8444-444444444444','test_run_key_0001') $$,
  '55000', 'A customer with production ledger history cannot become a demo account', 'demo enrollment cannot hide existing production money');

select throws_ok($$ insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,source_event,wallet_account_id,wallet_scope)
  values('len_aaab','33333333-3333-4333-8333-333333333333','DEPOSIT','PLAYABLE',2500,'fixture_deposit_a',current_setting('test.wallet_a')::uuid,'demo') $$,
  '23505', null, 'duplicate demo event cannot create a second ledger effect');
select throws_ok($$ insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,source_event,wallet_account_id,wallet_scope,currency)
  values('len_aaac','33333333-3333-4333-8333-333333333333','DEPOSIT','PLAYABLE',2500,'bad_currency',current_setting('test.wallet_a')::uuid,'demo','EUR') $$,
  '23503', null, 'wallet currency cannot be changed on a ledger posting');
select throws_ok($$ insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,source_event,wallet_account_id,wallet_scope)
  values('len_aaad','33333333-3333-4333-8333-333333333333','DEPOSIT','PLAYABLE',2500,'wrong_scope',current_setting('test.wallet_a')::uuid,'production') $$,
  '42501', null, 'simulated account cannot receive a production posting');
select throws_ok($$ insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,source_event,wallet_account_id)
  values('len_aaae','44444444-4444-4444-8444-444444444444','DEPOSIT','PLAYABLE',2500,'wrong_owner',current_setting('test.wallet_a')::uuid) $$,
  '23503', null, 'posting cannot reference another owner or scope');
select throws_ok($$ update public.ledger_entries set amount=1 where ledger_entry_id='len_aaaa' $$,
  '55000', 'Financial history is append-only', 'posted amounts cannot be edited');
select throws_ok($$ delete from public.ledger_entries where ledger_entry_id='len_aaaa' $$,
  '55000', 'Financial history is append-only', 'posted history cannot be deleted');
select throws_ok($$ delete from public.customers where id='33333333-3333-4333-8333-333333333333' $$,
  '23503', null, 'deleting a customer cannot cascade away wallet history');
select throws_ok($$ update public.wallet_accounts set scope='production',run_key=null where id=current_setting('test.wallet_a')::uuid $$,
  '55000', null, 'demo wallet cannot be relabeled production');

set local role authenticated;
select is((select count(id)::int from public.ledger_entries), 1, 'RLS shows A only A’s demo ledger');
select is(public.get_wallet_snapshot()->>'balanceCents', '2500', 'database snapshot reads the recorded fixture balance');
select is(jsonb_array_length(public.get_wallet_snapshot()->'entries'), 1, 'history matches the wallet scope');
select is((select count(id)::int from public.ledger_entries where customer_id='44444444-4444-4444-8444-444444444444'),
  0, 'explicitly requesting another customer still returns no rows');
select throws_ok($$ update public.ledger_entries set amount=999999 $$, '42501', null, 'customer cannot write ledger amounts');
select throws_ok($$ select funding_ip_address from public.ledger_entries $$, '42501', null, 'private fraud columns remain inaccessible');

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
set local request.jwt.claims = '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}';
select is(public.get_wallet_snapshot()->>'scope', 'production', 'production customer remains production');
select is(public.get_wallet_snapshot()->>'balanceCents', '9900', 'production balance excludes all demo money');
select is((select count(id)::int from public.ledger_entries), 1, 'production customer sees only their own row');

reset role;
-- A new compensating entry references the original; never rewrites it.
insert into public.ledger_entries(ledger_entry_id, customer_id, entry_type, balance_type, amount, source_event, wallet_account_id, wallet_scope, corrects_ledger_entry_id)
values('len_aaaf','33333333-3333-4333-8333-333333333333','CORRECTION','PLAYABLE',-500,'fixture_correction_a',current_setting('test.wallet_a')::uuid,'demo','len_aaaa');
select throws_ok($$ insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,source_event,wallet_account_id,wallet_scope,corrects_ledger_entry_id)
  values('len_aaba','33333333-3333-4333-8333-333333333333','CORRECTION','PLAYABLE',-100,'bad_correction',current_setting('test.wallet_a')::uuid,'demo','len_bbbb') $$,
  '23503', null, 'correction cannot reference another owner or scope');

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
set local request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';
select is(public.get_wallet_snapshot()->>'balanceCents', '2000', 'compensating entries affect the balance');

set local role service_role;
select set_config('test.wallet_a_new', public.start_demo_wallet_run('33333333-3333-4333-8333-333333333333','test_run_key_0002')::text, true);
select isnt(current_setting('test.wallet_a_new'), current_setting('test.wallet_a'), 'new walkthrough has a different wallet identity');
select throws_ok($$ select public.start_demo_wallet_run('33333333-3333-4333-8333-333333333333','test_run_key_0001') $$,
  '55000', null, 'late retry cannot reopen a retired walkthrough');
set local role authenticated;
select is(public.get_wallet_snapshot()->>'balanceCents', '0', 'reset starts at zero without deleting previous entries');
select is((select count(id)::int from public.ledger_entries), 0, 'retired run is invisible through direct client queries');
select throws_ok($$ select public.create_demo_funding_session(2500,'test_funding_0001') $$,
  '22023', null, 'retry from an old run cannot fund the new run');
reset role;
select is((select count(*)::int from public.ledger_entries where customer_id='33333333-3333-4333-8333-333333333333'),
  2, 'both historical postings are preserved after reset');
select throws_ok($$ insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,source_event,wallet_account_id,wallet_scope)
  values('len_aabb','33333333-3333-4333-8333-333333333333','DEPOSIT','PLAYABLE',100,'retired_run_event',current_setting('test.wallet_a')::uuid,'demo') $$,
  '55000', null, 'late event cannot post to a closed run');

-- More than the API response limit: no client-side summation is involved.
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,source_event,wallet_account_id,wallet_scope)
select 'len_' || md5('pagination-' || n), '33333333-3333-4333-8333-333333333333',
  'DEPOSIT','PLAYABLE',1,'fixture_pagination_' || n,current_setting('test.wallet_a_new')::uuid,'demo'
from generate_series(1,1005) n;
set local role authenticated;
select is(public.get_wallet_snapshot()->>'balanceCents', '1005', 'balance includes all 1,005 rows');
select is(public.get_wallet_snapshot()->>'transactionCount', '1005', 'total transaction count is not truncated');
select is(jsonb_array_length(public.get_wallet_snapshot()->'entries'), 50, 'recent history is bounded independently of balance');

set local role service_role;
update public.demo_payment_accounts set enabled=false where customer_id='33333333-3333-4333-8333-333333333333';
set local role authenticated;
select throws_ok($$ select public.get_wallet_snapshot() $$, '42501', 'Demo wallet access is disabled', 'disabled demo account does not fall back to production');
select throws_ok($$ select public.create_demo_funding_session(2500,'test_funding_0003') $$, '42501', null, 'revoked account cannot create new requests');
reset role;
select throws_ok($$ delete from public.demo_payment_accounts where customer_id='33333333-3333-4333-8333-333333333333' $$,
  '55000', null, 'demo enrollment cannot be deleted to turn an account into production');

set local role anon;
set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.get_wallet_snapshot() $$, '42501', null, 'anonymous caller cannot read wallets');
select throws_ok($$ select amount from public.ledger_entries $$, '42501', null, 'anonymous caller cannot read ledger');
select throws_ok($$ select public.create_demo_funding_session(2500,'test_funding_0004') $$, '42501', null, 'anonymous caller cannot create sessions');
reset role;
select * from finish();
rollback;
