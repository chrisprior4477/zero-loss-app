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
select throws_ok($$select public.confirm_demo_checkbox_funding(125,'whole_dollar_check_125','demo_card_4242',false,'funding-confirmation-v1')$$,'22023',null,'fractional dollar authorization rejected');
select throws_ok($$select public.confirm_demo_checkbox_funding(5050,'whole_dollar_check_5050','demo_card_4242',false,'funding-confirmation-v1')$$,'22023',null,'decimal amount cannot become a larger deposit');
select is(jsonb_array_length(public.get_demo_funding_requests()),0,'rejected amounts never create payments');
select lives_ok($$select public.confirm_demo_checkbox_funding(5000,'whole_dollar_check_5000','demo_card_1117',false,'funding-confirmation-v1')$$,'whole dollars accepted');
select lives_ok($$select public.create_demo_card_funding_session(5000,'whole_dollar_check_5000','demo_card_1117',false)$$,'whole dollar payment request accepted');
select is((public.resume_demo_funding_session(5000,'whole_dollar_check_5000')).amount::bigint,5000::bigint,'exact cents preserved');
select lives_ok($$select public.create_demo_card_funding_session(5000,'whole_dollar_check_5000','demo_card_1117',false)$$,'whole dollar request retry is safe');
select is(jsonb_array_length(public.get_demo_funding_requests()),1,'retry creates no second payment');
select is(public.get_wallet_snapshot()->>'balanceCents','0','unpaid request cannot change balance');
reset role;
select * from finish();
rollback;
