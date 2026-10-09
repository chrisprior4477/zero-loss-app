begin;
create extension if not exists pgtap;
select no_plan();

update demo_private.funding_config set enabled=true, preview_provisioning_enabled=true,
  preview_entries_enabled=true, preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
where singleton;

insert into demo_private.preview_entry_offerings(
  slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,
  sample_entries,forced_outcome,repeatable_scenario
) values ('closed-pool-option-test','Closed pool option','Test retailer','Test','/test.png',2500,100,11,
  1,'active',false);

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('99999999-9999-4999-8999-999999999991','closed-pool-owner@example.test',now(),
    '{"legal_first_name":"Closed","legal_last_name":"Pool","date_of_birth":"1990-01-01"}'::jsonb),
  ('99999999-9999-4999-8999-999999999992','closed-pool-other@example.test',now(),
    '{"legal_first_name":"Other","legal_last_name":"Pool","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status='active',verification_status='email_verified'
  where id in ('99999999-9999-4999-8999-999999999991','99999999-9999-4999-8999-999999999992');
select demo_private.ensure_preview_customer_for('99999999-9999-4999-8999-999999999991');
select demo_private.ensure_preview_customer_for('99999999-9999-4999-8999-999999999992');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,
  source_event,wallet_account_id,wallet_scope)
select 'len_'||replace(gen_random_uuid()::text,'-',''),w.customer_id,'DEPOSIT','PLAYABLE',1000,'USD',
  'closed_pool_option_test_funding',w.id,'demo' from public.wallet_accounts w
  where w.customer_id='99999999-9999-4999-8999-999999999991' and w.closed_at is null;

set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999991',true);
select set_config('request.jwt.claims',
  '{"sub":"99999999-9999-4999-8999-999999999991","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);

select public.create_preview_entries('closed-pool-option-test',10,'closed_pool_ten_entries_01');
select is((select count(*)::integer from public.completion_options c
  join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='closed-pool-option-test'),
  0,'the ten pending entries have no premature purchase options');
select public.confirm_preview_entry_request((select id from public.entry_requests
  where offering_slug='closed-pool-option-test'));
select is((select count(*)::integer from public.customer_entries where offering_slug='closed-pool-option-test'),
  10,'all ten final entries are saved independently');
select is((select count(*)::integer from public.entry_outcomes x join public.customer_entries e
  on e.id=x.customer_entry_id where e.offering_slug='closed-pool-option-test' and x.outcome='not_selected'),
  10,'filling the final ten spots resolves every paid entry');
select is((select count(*)::integer from public.completion_options c join public.customer_entries e
  on e.id=c.customer_entry_id where e.offering_slug='closed-pool-option-test'),
  10,'each nonwinning paid entry has its own completion option');
select is((select count(*)::integer from jsonb_array_elements(public.get_account_activity()) a
  where a->>'status'='completion'),10,'My Activity shows ten purchase options');

select is(public.decline_purchase_option((select c.id from public.completion_options c
  join public.customer_entries e on e.id=c.customer_entry_id
  where e.offering_slug='closed-pool-option-test' order by e.entry_id limit 1),
  'closed_pool_decline_request_01')->>'status','declined','an owned option can be declined');
select is((select count(*)::integer from jsonb_array_elements(public.get_account_activity()) a
  where a->>'completion_option_status'='declined'),1,'decline is visible in saved activity');
select is(public.revive_preview_purchase_option((select c.id from public.completion_options c
  join public.customer_entries e on e.id=c.customer_entry_id
  where e.offering_slug='closed-pool-option-test' order by e.entry_id limit 1),
  'closed_pool_revive_request_01')->>'status','available','declined option is revived without a new charge');
select is((select count(*)::integer from jsonb_array_elements(public.get_account_activity()) a
  where a->>'status'='completion'),10,'revived option returns to Purchase Options');
select is(public.decline_purchase_option((select c.id from public.completion_options c
  join public.customer_entries e on e.id=c.customer_entry_id
  where e.offering_slug='closed-pool-option-test' order by e.entry_id limit 1),
  'closed_pool_decline_request_01')->>'status','declined','a revived option can be declined again');
select is((select count(*)::integer from public.ledger_entries where entry_type='REFUND'
  and customer_id='99999999-9999-4999-8999-999999999991'),0,'neither decline nor revival refunds the entry');
select is((select count(*)::integer from public.completion_option_events ce
  join public.completion_options c on c.id=ce.completion_option_id
  join public.customer_entries e on e.id=c.customer_entry_id
  where e.offering_slug='closed-pool-option-test' and ce.event_type='revived'),1,
  'one immutable revival event is recorded');

select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999992',true);
select set_config('request.jwt.claims',
  '{"sub":"99999999-9999-4999-8999-999999999992","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$ select public.revive_preview_purchase_option((select c.id from public.completion_options c
  join public.customer_entries e on e.id=c.customer_entry_id
  where e.offering_slug='closed-pool-option-test' limit 1),'closed_pool_other_revive_01') $$,
  '42501',null,'another customer cannot revive this option');

reset role;
select is((select count(*)::integer from demo_private.preview_closed_pool_demo_winners
  where offering_slug='closed-pool-option-test' and sample_entry_number=1),
  1,'the preview records exactly one winner in its seeded crowd');
select * from finish();
rollback;
