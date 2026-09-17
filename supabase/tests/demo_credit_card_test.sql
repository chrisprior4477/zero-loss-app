begin;
create extension if not exists pgtap;
select no_plan();
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,
  preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('98999999-9999-4999-8999-999999999991','card-one@example.test',now(),'{"legal_first_name":"Card","legal_last_name":"One","date_of_birth":"1990-01-01"}'::jsonb),
  ('98999999-9999-4999-8999-999999999992','card-two@example.test',now(),'{"legal_first_name":"Card","legal_last_name":"Two","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status='active',verification_status='email_verified'
  where id in ('98999999-9999-4999-8999-999999999991','98999999-9999-4999-8999-999999999992');
select demo_private.ensure_preview_customer_for('98999999-9999-4999-8999-999999999991');
select demo_private.ensure_preview_customer_for('98999999-9999-4999-8999-999999999992');
set local role authenticated;
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999991',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999991","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.get_demo_payment_method(),null::jsonb,'new account has no saved card');
select throws_ok($$select public.create_demo_card_funding_session(2500,'card_request_key_01','real_card_token',true)$$,'22023',null,'other card tokens rejected');
select throws_ok($$select public.create_demo_card_funding_session(2500,'card_request_key_01','demo_card_4242',null)$$,'22023',null,'default preference must be explicit');
select throws_ok($$select public.create_demo_card_funding_session(99,'card_request_key_01','demo_card_4242',true)$$,'22023',null,'amount rules unchanged');
select is(public.get_demo_payment_method(),null::jsonb,'failed request does not save a default');
select lives_ok($$select public.create_demo_card_funding_session(2500,'card_request_key_01','demo_card_4242',true)$$,'test card accepted');
select is(public.get_demo_payment_method(),'{"token":"demo_card_4242","lastFour":"4242","isDefault":true}'::jsonb,'safe default metadata persisted');
select is(public.get_wallet_snapshot()->>'balanceCents','0','card selection and funding request do not directly credit balance');
select lives_ok($$
  with receipt as (select public.simulate_demo_payment((public.resume_demo_funding_session(2500,'card_request_key_01')).id) as r)
  select public.accept_demo_payment_event(r->>'body',r->>'signature') from receipt
$$,'verified simulated event posts payment');
select is(public.get_wallet_snapshot()->>'balanceCents','2500','balance increases from verified ledger credit');
select lives_ok($$
  with receipt as (select public.simulate_demo_payment((public.create_demo_card_funding_session(2500,'card_request_key_01','demo_card_4242',true)).id) as r)
  select public.accept_demo_payment_event(r->>'body',r->>'signature') from receipt
$$,'repeat payment reuses receipt and posting');
select is(public.get_wallet_snapshot()->>'balanceCents','2500','replay cannot credit twice');
select throws_ok($$select public.create_demo_card_funding_session(1000,'card_request_key_01','demo_card_4242',true)$$,'22023',null,'altered amount rejected');
select throws_ok($$select public.create_demo_card_funding_session(2500,'card_request_key_01','demo_card_4242',false)$$,'22023',null,'altered card preference replay rejected');
select lives_ok($$select public.create_demo_card_funding_session(1000,'card_request_key_02','demo_card_4242',false)$$,'next payment may opt out of default');
select is(public.get_demo_payment_method()->>'isDefault','false','opt out persists');
select lives_ok($$select public.create_demo_card_funding_session(2500,'card_request_key_01','demo_card_4242',true)$$,'old payment can still be recovered');
select is(public.get_demo_payment_method()->>'isDefault','false','old replay never overwrites newer preference');
select lives_ok($$select public.create_demo_card_funding_session(100,'card_request_key_03','demo_card_4242',false)$$,'third request allowed');
select throws_ok($$select public.create_demo_card_funding_session(100,'card_request_key_04','demo_card_4242',true)$$,'P0001','Demo limit: three new requests per minute. Retry this request later.','card path retains DB-enforced rate limit');
select is(public.get_demo_payment_method()->>'isDefault','false','limited request does not change default');
select throws_ok($$select public.resume_demo_funding_session(100,'card_missing_key_99')$$,'P0001',null,'recovery cannot create a new request');
select throws_ok($$select * from demo_private.customer_payment_methods$$,'42501',null,'direct private card reads denied');
select throws_ok($$update demo_private.customer_payment_methods set is_default=true$$,'42501',null,'direct private card writes denied');
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999992',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999992","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.get_demo_payment_method(),null::jsonb,'second account cannot read first account method');
select throws_ok($$select public.resume_demo_funding_session(2500,'card_request_key_01')$$,'P0001',null,'second account cannot recover first account payment');
select is(public.get_wallet_snapshot()->>'balanceCents','0','second account remains at zero');
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999992","iss":"https://wrong.supabase.co/auth/v1"}',true);
select throws_ok($$select public.create_demo_card_funding_session(100,'card_wrong_project_01','demo_card_4242',true)$$,'42501',null,'wrong project issuer denied');
select throws_ok($$select public.get_demo_payment_method()$$,'42501',null,'wrong issuer cannot read methods');
reset role;
select is((select count(*)::integer from demo_private.customer_payment_methods where customer_id='98999999-9999-4999-8999-999999999991'),1,'one simulated method per account, not an unlimited card creator');
select is((select count(*)::integer from demo_private.funding_payment_methods where customer_id='98999999-9999-4999-8999-999999999991'),3,'one immutable method association per request');
select throws_ok($$update demo_private.funding_payment_methods set make_default=false where customer_id='98999999-9999-4999-8999-999999999991'$$,'55000',null,'financial request method snapshot immutable');
select throws_ok($$delete from demo_private.funding_payment_methods where customer_id='98999999-9999-4999-8999-999999999991'$$,'55000',null,'financial method audit history cannot be deleted');
select throws_ok($$insert into demo_private.funding_payment_methods(session_id,customer_id,provider_token,make_default)
  select id,'98999999-9999-4999-8999-999999999992','demo_card_4242',false from public.demo_funding_sessions
  where customer_id='98999999-9999-4999-8999-999999999991' limit 1$$,'23505',null,'duplicate session association rejected');
insert into demo_private.customer_payment_methods(customer_id) values('98999999-9999-4999-8999-999999999992');
insert into public.demo_funding_sessions(customer_id,wallet_account_id,amount,idempotency_key)
  select customer_id,id,100,'card_legacy_key_05' from public.wallet_accounts
  where customer_id='98999999-9999-4999-8999-999999999991' and scope='demo' and closed_at is null;
select throws_ok($$insert into demo_private.funding_payment_methods(session_id,customer_id,provider_token,make_default)
  select id,'98999999-9999-4999-8999-999999999992','demo_card_4242',false from public.demo_funding_sessions
  where customer_id='98999999-9999-4999-8999-999999999991' and idempotency_key='card_legacy_key_05'$$,'23503',null,'composite foreign key prevents cross-customer association');
select is((select count(*)::integer from information_schema.columns where table_schema='demo_private'
  and table_name in ('customer_payment_methods','funding_payment_methods') and column_name in ('pan','card_number','cvc','cvv','security_code')),0,'no storage columns for PAN or security code');
update auth.users set email_confirmed_at=null where id='98999999-9999-4999-8999-999999999992';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999992","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$select public.create_demo_card_funding_session(100,'card_unconfirmed_01','demo_card_4242',false)$$,'42501',null,'unconfirmed account cannot fund');
set local role anon;
select throws_ok($$select public.get_demo_payment_method()$$,'42501',null,'anonymous read denied');
select throws_ok($$select public.create_demo_card_funding_session(100,'card_anonymous_01','demo_card_4242',false)$$,'42501',null,'anonymous funding denied');
reset role;
select * from finish();
rollback;
