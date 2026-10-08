begin;
create extension if not exists pgtap;
select no_plan();

update demo_private.funding_config set enabled=true, preview_provisioning_enabled=true,
  preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1', environment='development-test'
  where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('98999999-9999-4999-8999-999999999971','clear-one@example.test',now(),'{"legal_first_name":"Demo","legal_last_name":"One","date_of_birth":"1990-01-01"}'::jsonb),
  ('98999999-9999-4999-8999-999999999972','clear-two@example.test',now(),'{"legal_first_name":"Demo","legal_last_name":"Two","date_of_birth":"1990-01-01"}'::jsonb),
  ('98999999-9999-4999-8999-999999999973','clear-prod@example.test',now(),'{"legal_first_name":"Demo","legal_last_name":"Prod","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status='active', verification_status='email_verified'
  where id in ('98999999-9999-4999-8999-999999999971','98999999-9999-4999-8999-999999999972','98999999-9999-4999-8999-999999999973');
select demo_private.ensure_preview_customer_for('98999999-9999-4999-8999-999999999971');
select demo_private.ensure_preview_customer_for('98999999-9999-4999-8999-999999999972');
insert into public.ledger_entries(ledger_entry_id,customer_id,wallet_account_id,wallet_scope,
  entry_type,balance_type,amount,currency,source_event)
select 'len_'||replace(gen_random_uuid()::text,'-',''),customer_id,id,'demo',
  'CORRECTION','PLAYABLE',1700,'USD','clear_test_seed_01'
from public.wallet_accounts where customer_id='98999999-9999-4999-8999-999999999971'
  and scope='demo' and closed_at is null;

set local role authenticated;
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999971',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999971","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.get_wallet_snapshot()->>'balanceCents','1700','seeded demo wallet is funded');
select throws_ok($$select public.clear_demo_playable_balance(1600,'clear_balance_key_01')$$,
  'P0001',null,'stale confirmation cannot clear a different amount');
select is(public.get_wallet_snapshot()->>'balanceCents','1700','failed clear leaves the balance unchanged');
select is(public.clear_demo_playable_balance(1700,'clear_balance_key_01')->>'clearedCents','1700','confirmed amount is cleared');
select is(public.get_wallet_snapshot()->>'balanceCents','0','ledger-derived balance is zero');
select is(public.get_wallet_snapshot()->>'transactionCount','2','original funding history and adjustment remain');
select is(public.clear_demo_playable_balance(1700,'clear_balance_key_01')->>'alreadyApplied','true','retry is idempotent');
select is(public.get_wallet_snapshot()->>'transactionCount','2','retry never posts a second debit');
select is(public.clear_demo_playable_balance(0,'clear_balance_key_02')->>'clearedCents','0','zero wallet is a no-op');
select is(public.get_wallet_snapshot()->>'transactionCount','2','zero wallet adds no ledger row');
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999972',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999972","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.get_wallet_snapshot()->>'balanceCents','0','another customer wallet is unaffected');
select throws_ok($$select public.clear_demo_playable_balance(1700,'clear_balance_key_01')$$,
  'P0001',null,'another account cannot reuse the first account balance');
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999972","iss":"https://wrong.supabase.co/auth/v1"}',true);
select throws_ok($$select public.clear_demo_playable_balance(0,'clear_balance_key_03')$$,
  '42501',null,'wrong project issuer is rejected');
select set_config('request.jwt.claim.sub','98999999-9999-4999-8999-999999999973',true);
select set_config('request.jwt.claims','{"sub":"98999999-9999-4999-8999-999999999973","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$select public.clear_demo_playable_balance(0,'clear_balance_key_04')$$,
  '42501',null,'production wallet is not resettable');
set local role anon;
select throws_ok($$select public.clear_demo_playable_balance(0,'clear_balance_key_05')$$,
  '42501',null,'anonymous callers cannot clear funds');
reset role;
select is((select count(*)::integer from public.customer_entries
  where customer_id='98999999-9999-4999-8999-999999999971'),0,'no entry records were changed');
select is((select count(*)::integer from public.customer_rewards
  where customer_id='98999999-9999-4999-8999-999999999971'),0,'no reward records were changed');
select * from finish();
rollback;
