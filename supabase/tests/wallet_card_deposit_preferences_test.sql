begin;
create extension if not exists pgtap;
select no_plan();
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,
  preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('97999999-9999-4999-8999-999999999991','saved-card-one@example.test',now(),'{"legal_first_name":"Saved","legal_last_name":"One","date_of_birth":"1990-01-01"}'::jsonb),
  ('97999999-9999-4999-8999-999999999992','saved-card-two@example.test',now(),'{"legal_first_name":"Saved","legal_last_name":"Two","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status='active',verification_status='email_verified'
  where id in ('97999999-9999-4999-8999-999999999991','97999999-9999-4999-8999-999999999992');
select demo_private.ensure_preview_customer_for('97999999-9999-4999-8999-999999999991');
select demo_private.ensure_preview_customer_for('97999999-9999-4999-8999-999999999992');

set local role authenticated;
select set_config('request.jwt.claim.sub','97999999-9999-4999-8999-999999999991',true);
select set_config('request.jwt.claims','{"sub":"97999999-9999-4999-8999-999999999991","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.save_demo_card_preferences('demo_card_4242',true,false)->>'isDepositDefault','false','transaction default can opt out of deposit default');
select is(public.save_demo_card_preferences('demo_card_1117',false,true)->>'isDepositDefault','true','fifth card can be deposit default only');
select ok(exists(select 1 from jsonb_array_elements(public.get_demo_payment_methods()) c where c->>'token'='demo_card_4242' and c->>'isDefault'='true' and c->>'isDepositDefault'='false'),'transaction default stays independent');
select is(public.save_demo_payment_method('demo_card_1117',true)->>'isDepositDefault','true','legacy transaction preference save preserves deposit preference');
select is(public.get_wallet_snapshot()->>'balanceCents','0','card preferences never add funds');
select is(jsonb_array_length(public.get_demo_funding_requests()),0,'card preferences never create a payment');
select throws_ok($$select public.save_demo_card_preferences('real_token',true,true)$$,'22023',null,'reject arbitrary card tokens');
select throws_ok($$select public.save_demo_card_preferences('demo_card_4242',true,null)$$,'22023',null,'require explicit deposit preference');
select lives_ok($$select public.save_demo_card_preferences('demo_card_1881',false,true)$$,'switch deposit default');
select is((select count(*)::integer from jsonb_array_elements(public.get_demo_payment_methods()) c where c->>'isDepositDefault'='true'),1,'only one deposit default');
select lives_ok($$select public.delete_demo_payment_method('demo_card_1881')$$,'remove deposit default');
select is((select count(*)::integer from jsonb_array_elements(public.get_demo_payment_methods()) c where c->>'isDepositDefault'='true'),0,'deleted card no longer default');
select set_config('request.jwt.claim.sub','97999999-9999-4999-8999-999999999992',true);
select set_config('request.jwt.claims','{"sub":"97999999-9999-4999-8999-999999999992","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(jsonb_array_length(public.get_demo_payment_methods()),0,'other customer cannot read first customer cards');
select lives_ok($$select public.save_demo_card_preferences('demo_card_4242',false,true)$$,'other customer owns their separate default');
select set_config('request.jwt.claim.sub','97999999-9999-4999-8999-999999999991',true);
select set_config('request.jwt.claims','{"sub":"97999999-9999-4999-8999-999999999991","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is((select count(*)::integer from jsonb_array_elements(public.get_demo_payment_methods()) c where c->>'isDepositDefault'='true'),0,'another customer cannot change my default');
set local role anon;
select throws_ok($$select public.save_demo_card_preferences('demo_card_4242',true,true)$$,'42501',null,'anonymous save denied');
reset role;
select * from finish();
rollback;
