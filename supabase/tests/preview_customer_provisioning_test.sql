begin;
create extension if not exists pgtap;
select no_plan();

update demo_private.funding_config
set enabled = true,
    preview_provisioning_enabled = true,
    preview_issuer = 'https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
where singleton;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values
  ('88888888-8888-4888-8888-888888888881','preview-one@example.test',now(),
   '{"legal_first_name":"Preview","legal_last_name":"One","date_of_birth":"1990-01-01"}'::jsonb),
  ('88888888-8888-4888-8888-888888888882','preview-two@example.test',now(),
   '{"legal_first_name":"Preview","legal_last_name":"Two","date_of_birth":"1990-01-01"}'::jsonb),
  ('88888888-8888-4888-8888-888888888883','preview-pending@example.test',null,
   '{"legal_first_name":"Preview","legal_last_name":"Pending","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status='active', verification_status='email_verified'
where id in ('88888888-8888-4888-8888-888888888881','88888888-8888-4888-8888-888888888882');

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888881',true);
select set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888881","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);

select is(public.ensure_preview_customer()->>'scope','demo','confirmed customer receives preview wallet');
select is(public.ensure_preview_customer()->>'fundingAvailable','true','confirmed customer receives ordinary Add Funds access');
select is(public.get_wallet_snapshot()->>'balanceCents','0','provisioning creates no ledger credit');
select is(public.get_wallet_snapshot()->>'transactionCount','0','new customer transaction history is empty');
select is(public.get_wallet_snapshot()->>'scope','demo','authoritative snapshot uses preview wallet');
select is((public.ensure_preview_customer()->>'walletAccountId'),(public.ensure_preview_customer()->>'walletAccountId'),'repeated provisioning returns same wallet');
select set_config('test.preview_sid',(public.create_demo_funding_session(100,'preview_funding_key_01')).id::text,true);
select set_config('test.preview_receipt',public.simulate_demo_payment(current_setting('test.preview_sid')::uuid)::text,true);
select is(public.accept_demo_payment_event(current_setting('test.preview_receipt')::jsonb->>'body',current_setting('test.preview_receipt')::jsonb->>'signature')->>'duplicate','false','new preview customer can complete simulated funding');
select is(public.get_wallet_snapshot()->>'balanceCents','100','simulated funding posts exactly one ledger credit');
select is(public.accept_demo_payment_event(current_setting('test.preview_receipt')::jsonb->>'body',current_setting('test.preview_receipt')::jsonb->>'signature')->>'duplicate','true','funding replay is idempotent');
select is(public.get_wallet_snapshot()->>'transactionCount','1','replay cannot duplicate the ledger credit');
reset role;

select is((select count(*)::integer from public.wallet_accounts where customer_id='88888888-8888-4888-8888-888888888881' and scope='demo' and closed_at is null),1,'retries create one open wallet');
select is((select count(*)::integer from public.demo_payment_accounts where customer_id='88888888-8888-4888-8888-888888888881' and enabled and funding_enabled),1,'automatic funding membership is unique');
select is((select count(*)::integer from public.ledger_entries where customer_id='88888888-8888-4888-8888-888888888881'),1,'only the explicit funding journey writes a ledger entry');
select is((select display_name from public.customer_profiles where customer_id='88888888-8888-4888-8888-888888888881'),null,'provisioning does not manufacture a display name');

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888882',true);
select set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888882","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select lives_ok($$ select public.ensure_preview_customer() $$,'second customer can provision own foundation');
select is(public.get_wallet_snapshot()->>'balanceCents','0','second customer cannot inherit first customer balance');
select is((select count(*)::integer from public.ledger_entries),0,'RLS exposes no other customer ledger rows');
select throws_ok($$ select public.ensure_preview_customer('88888888-8888-4888-8888-888888888881'::uuid) $$,'42883',null,'client-supplied customer id is rejected');

select set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888882","iss":"https://wrong-project.supabase.co/auth/v1"}',true);
select throws_ok($$ select public.ensure_preview_customer() $$,'42501',null,'wrong project issuer fails closed');

select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888883',true);
select set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888883","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$ select public.ensure_preview_customer() $$,'42501','A confirmed account is required','unconfirmed customer cannot provision');
reset role;

update demo_private.funding_config set preview_provisioning_enabled=false where singleton;
set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888881',true);
select set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888881","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$ select public.ensure_preview_customer() $$,'42501',null,'production-disabled configuration fails closed');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select throws_ok($$ select public.ensure_preview_customer() $$,'42501',null,'anonymous user cannot provision');
reset role;

select * from finish();
rollback;
