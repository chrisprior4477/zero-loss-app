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
select is(public.get_demo_payment_method(),null::jsonb,'new account begins without a saved method');
select throws_ok($$select public.save_demo_payment_method('real_card_token',true)$$,'22023',null,'arbitrary tokens are rejected');
select throws_ok($$select public.save_demo_payment_method('demo_card_4242',null)$$,'22023',null,'default preference must be explicit');
select is(public.save_demo_payment_method('demo_card_4242',true),
  '{"token":"demo_card_4242","lastFour":"4242","isDefault":true}'::jsonb,'safe test method saves independently');
select is(public.get_demo_payment_method()->>'isDefault','true','saved method is readable by its owner');
select is(public.get_wallet_snapshot()->>'balanceCents','0','saving a card never changes balance');
select is(jsonb_array_length(public.get_demo_funding_requests()),0,'saving a card never creates a funding request');
select is(public.save_demo_payment_method('demo_card_4242',false)->>'isDefault','false','saving again updates preference without adding a method');

select set_config('request.jwt.claim.sub','97999999-9999-4999-8999-999999999992',true);
select set_config('request.jwt.claims','{"sub":"97999999-9999-4999-8999-999999999992","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.get_demo_payment_method(),null::jsonb,'another account cannot read the first account method');
select set_config('request.jwt.claims','{"sub":"97999999-9999-4999-8999-999999999992","iss":"https://wrong.supabase.co/auth/v1"}',true);
select throws_ok($$select public.save_demo_payment_method('demo_card_4242',true)$$,'42501',null,'wrong project issuer is denied');

reset role;
select is((select count(*)::integer from demo_private.customer_payment_methods where customer_id='97999999-9999-4999-8999-999999999991'),1,'method storage remains bounded to one row per account');
update auth.users set email_confirmed_at=null where id='97999999-9999-4999-8999-999999999992';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"97999999-9999-4999-8999-999999999992","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$select public.save_demo_payment_method('demo_card_4242',false)$$,'42501',null,'unconfirmed account cannot save a method');
set local role anon;
select throws_ok($$select public.save_demo_payment_method('demo_card_4242',false)$$,'42501',null,'anonymous save is denied');
reset role;
select * from finish();
rollback;
