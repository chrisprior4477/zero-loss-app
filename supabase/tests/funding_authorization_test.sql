begin;
create extension if not exists pgtap;
select no_plan();
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,funding_reauth_required=true,
  preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('98999999-9999-4999-8999-999999999971','funding-confirm@example.test',now(),'{"legal_first_name":"Test","legal_last_name":"Authorization","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id='98999999-9999-4999-8999-999999999971';
select demo_private.ensure_preview_customer_for('98999999-9999-4999-8999-999999999971');
set local role authenticated;
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999971',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999971","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$select public.create_demo_card_funding_session(2500,'funding_confirm_test_01','demo_card_4242',false)$$,'P0001',null,'card RPC cannot bypass fresh confirmation');
select throws_ok($$select public.create_demo_funding_session(2500,'funding_confirm_test_01')$$,'P0001',null,'legacy direct RPC cannot bypass confirmation');
select throws_ok($$select public.authorize_demo_funding(2500,'funding_confirm_test_01',false,'funding-confirmation-v1')$$,'P0001',null,'a signed-in session without fresh password proof is insufficient');
select set_config('request.jwt.claims',jsonb_build_object('sub',auth.uid(),'iss','https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1',
  'session_id','11111111-1111-4111-8111-111111111171','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from clock_timestamp()-interval '5 minutes'))))::text,true);
select throws_ok($$select public.authorize_demo_funding(2500,'funding_confirm_test_01',false,'funding-confirmation-v1')$$,'P0001',null,'old password proof rejected');
select set_config('request.jwt.claims',jsonb_build_object('sub',auth.uid(),'iss','https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1',
  'session_id','11111111-1111-4111-8111-111111111171','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from clock_timestamp()))))::text,true);
select throws_ok($$select public.authorize_demo_funding(2500,'funding_confirm_test_01',false,'old-policy')$$,'22023',null,'policy acknowledgement version checked');
select lives_ok($$select public.authorize_demo_funding(2500,'funding_confirm_test_01',false,'funding-confirmation-v1')$$,'fresh password proof authorizes exact request');
select throws_ok($$select public.authorize_demo_funding(2500,'funding_confirm_test_02',false,'funding-confirmation-v1')$$,'23505',null,'one password session cannot authorize two different deposits');
select throws_ok($$select public.create_demo_card_funding_session(1000,'funding_confirm_test_01','demo_card_4242',false)$$,'P0001',null,'changed amount rejected at database boundary');
select throws_ok($$select public.create_demo_card_funding_session(2500,'funding_confirm_test_01','demo_card_4242',true)$$,'22023',null,'changed card preference rolls back whole payment creation');
select lives_ok($$select public.create_demo_card_funding_session(2500,'funding_confirm_test_01','demo_card_4242',false)$$,'confirmed deposit creates exactly one session');
select lives_ok($$select public.create_demo_card_funding_session(2500,'funding_confirm_test_01','demo_card_4242',false)$$,'exact retry does not require another authorization');
select lives_ok($$with receipt as (select public.simulate_demo_payment((public.resume_demo_funding_session(2500,'funding_confirm_test_01')).id) r)
  select public.accept_demo_payment_event(r->>'body',r->>'signature') from receipt$$,'authorized deposit reaches ledger');
select is(public.get_wallet_snapshot()->>'balanceCents','2500','exact approved amount posted');
select throws_ok($$select * from demo_private.funding_authorizations$$,'42501',null,'authorization evidence is not publicly readable');
reset role;
select is((select count(*)::integer from demo_private.funding_authorizations where customer_id='98999999-9999-4999-8999-999999999971'),1,'failed and replayed requests do not duplicate approval');
select is((select count(*)::integer from public.demo_funding_sessions where customer_id='98999999-9999-4999-8999-999999999971'),1,'failed and replayed requests do not duplicate funding');
select throws_ok($$update demo_private.funding_authorizations set amount=1000 where customer_id='98999999-9999-4999-8999-999999999971'$$,'42501',null,'authorization history cannot be rewritten');
select throws_ok($$delete from demo_private.funding_authorizations where customer_id='98999999-9999-4999-8999-999999999971'$$,'42501',null,'authorization history cannot be erased');
insert into demo_private.funding_authorizations(customer_id,wallet_account_id,request_key,amount,payment_method,make_default,policy_version,auth_session_id,authenticated_at,created_at,expires_at)
values('98999999-9999-4999-8999-999999999971',public.current_wallet_account_id(),'funding_expired_test_01',1000,'demo_card_4242',false,'funding-confirmation-v1','11111111-1111-4111-8111-111111111172',now()-interval '10 minutes',now()-interval '10 minutes',now()-interval '8 minutes');
set local role authenticated;
select throws_ok($$select public.create_demo_card_funding_session(1000,'funding_expired_test_01','demo_card_4242',false)$$,'P0001',null,'expired approval cannot create payment');
select throws_ok($$select public.resume_demo_funding_session(1000,'funding_expired_test_01')$$,'P0001',null,'recovery cannot manufacture a missing payment');
select lives_ok($$with receipt as (select public.simulate_demo_payment((public.resume_demo_funding_session(2500,'funding_confirm_test_01')).id) r)
  select public.accept_demo_payment_event(r->>'body',r->>'signature') from receipt$$,'recovery replays the original receipt');
select is(public.get_wallet_snapshot()->>'balanceCents','2500','receipt replay leaves balance unchanged');
select lives_ok($$select public.begin_demo_funding_authentication(1000,'funding_attempt_test_01')$$,'password attempt recorded before verification');
select lives_ok($$select public.begin_demo_funding_authentication(1000,'funding_attempt_test_01') from generate_series(1,4)$$,'first five password attempts permitted');
select throws_ok($$select public.begin_demo_funding_authentication(1000,'funding_attempt_test_01')$$,'P0001',null,'sixth password attempt throttled');
select throws_ok($$select * from demo_private.funding_authentication_attempts$$,'42501',null,'authentication attempts not client readable');
reset role;
select is((select count(*)::integer from demo_private.funding_authentication_attempts where customer_id='98999999-9999-4999-8999-999999999971'),5,'throttled attempt creates no extra row');
select throws_ok($$delete from demo_private.funding_authentication_attempts where customer_id='98999999-9999-4999-8999-999999999971'$$,'42501',null,'authentication attempt history cannot be erased');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('98999999-9999-4999-8999-999999999972','other-funding@example.test',now(),'{"legal_first_name":"Other","legal_last_name":"Authorization","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id='98999999-9999-4999-8999-999999999972';
select demo_private.ensure_preview_customer_for('98999999-9999-4999-8999-999999999972');
set local role authenticated;
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999972',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999972","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$select public.create_demo_card_funding_session(2500,'funding_confirm_test_01','demo_card_4242',false)$$,'P0001',null,'another customer cannot consume approval');
select lives_ok($$select public.begin_demo_funding_authentication(1000,'funding_attempt_test_01')$$,'throttle is owner scoped');
select is(public.get_wallet_snapshot()->>'balanceCents','0','another wallet never credited');
reset role;
select * from finish();
rollback;
