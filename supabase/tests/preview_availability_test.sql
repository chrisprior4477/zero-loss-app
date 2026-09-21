begin;
create extension if not exists pgtap;
select no_plan();
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,
  preview_entries_enabled=true,preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;

insert into demo_private.preview_entry_offerings
  (slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries)
values('availability-audit','Availability test','Test','Test','/test.png',2500,100,10,8);

insert into demo_private.preview_entry_offerings
  (slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries,forced_outcome,repeatable_scenario)
values
  ('samsung-m70h-tv','TV test','Test','Test','/test.png',40000,100,1200,1199,'winner',true),
  ('nike-court-shot-shoes','Shoe test','Test','Test','/test.png',7500,100,225,224,'not_selected',true),
  ('babys-essentials-bundle','Baby test','Test','Test','/test.png',10000,100,300,299,'not_selected',true)
on conflict(slug) do update set capacity=excluded.capacity,sample_entries=excluded.sample_entries,
  forced_outcome=excluded.forced_outcome,repeatable_scenario=true,active=true;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values('12121212-1212-4212-8212-121212121212','availability@example.test',now(),
  '{"legal_first_name":"Availability","legal_last_name":"Test","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status='active',verification_status='email_verified'
  where id='12121212-1212-4212-8212-121212121212';
select demo_private.ensure_preview_customer_for('12121212-1212-4212-8212-121212121212');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
select 'len_12121212121242128212121212121212',customer_id,'DEPOSIT','PLAYABLE',10000,'USD','availability_test_deposit',id,'demo'
from public.wallet_accounts where customer_id='12121212-1212-4212-8212-121212121212' and closed_at is null;

set local role anon;
select is((select a->>'remaining' from jsonb_array_elements(public.get_preview_offering_availability()) a where a->>'slug'='availability-audit'),'2','anonymous visitors see the sample crowd in remaining capacity');
select is((select count(*)::integer from jsonb_array_elements(public.get_preview_offering_availability()) a,
  jsonb_object_keys(a) k where k not in ('slug','capacity','sold','remaining','entryPriceCents','repeatableScenario')),0,
  'public availability exposes only the approved aggregate fields');
select throws_ok($$select * from demo_private.preview_entry_offerings$$,'42501',null,'anonymous users cannot read private offering configuration');
select throws_ok($$select public.create_preview_entries('availability-audit',1,'availability_anon_key')$$,'42501',null,'anonymous users cannot purchase');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','12121212-1212-4212-8212-121212121212',true);
select set_config('request.jwt.claims','{"sub":"12121212-1212-4212-8212-121212121212","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.create_preview_entries('availability-audit',1,'availability_first_key')->>'quantity','1','first purchase saves one entry');
select is((select a->>'remaining' from jsonb_array_elements(public.get_preview_offering_availability()) a where a->>'slug'='availability-audit'),'1','purchase reduces the public remaining count from two to one');
select throws_ok($$select public.create_preview_entries('availability-audit',2,'availability_excess_key')$$,'P0001','There are not enough entries remaining for that quantity.','database enforces sample-plus-purchase capacity');
select is(public.get_wallet_snapshot()->>'balanceCents','9900','rejected excess quantity makes no additional debit');
select is((select count(*)::integer from public.customer_entries where offering_slug='availability-audit'),1,'rejected quantity creates no partial entries');
select is(public.create_preview_entries('availability-audit',1,'availability_second_key')->>'quantity','1','last ordinary slot is accepted');
select is((select a->>'remaining' from jsonb_array_elements(public.get_preview_offering_availability()) a where a->>'slug'='availability-audit'),'0','display and database both show full');
select is(public.create_preview_entries('availability-audit',1,'availability_second_key')->>'duplicate','true','replay still succeeds idempotently after a pool fills');
select throws_ok($$select public.create_preview_entries('availability-audit',1,'availability_full_key')$$,'P0001',null,'new request cannot exceed a full ordinary pool');
select is(public.get_wallet_snapshot()->>'balanceCents','9800','full-pool retries cannot debit again');
select throws_ok($$update demo_private.preview_entry_offerings set repeatable_scenario=true where slug='availability-audit'$$,'42501',null,'customer cannot turn an ordinary pool into an unlimited fixture');
reset role;

select throws_ok($$update demo_private.preview_entry_offerings set repeatable_scenario=true where slug='availability-audit'$$,'23514',null,'database allowlist limits repeatability to the three approved showcases');
select is((select count(*)::integer from demo_private.preview_entry_offerings where repeatable_scenario),3,'exactly three showcase scenarios are repeatable');

-- Test a second run after the same user has already completed each showcase.
set local role authenticated;
select is(public.create_preview_entries('samsung-m70h-tv',1,'availability_tv_one')->>'status','winner','TV still wins');
select is(public.create_preview_entries('samsung-m70h-tv',1,'availability_tv_two')->>'status','winner','TV can be demonstrated again without a new round');
select is(public.create_preview_entries('nike-court-shot-shoes',1,'availability_shoe_one')->>'status','not_selected','shoes preserve their completion outcome');
select is(public.create_preview_entries('nike-court-shot-shoes',1,'availability_shoe_two')->>'status','not_selected','shoes can be demonstrated again');
select is(public.create_preview_entries('babys-essentials-bundle',1,'availability_baby_one')->>'status','not_selected','baby bundle preserves its completion outcome');
select is(public.create_preview_entries('babys-essentials-bundle',1,'availability_baby_two')->>'status','not_selected','baby bundle can be demonstrated again');
select is((select count(*)::integer from public.customer_rewards),2,'repeated TV test has two separate reward records');
select is((select count(*)::integer from public.completion_options),4,'repeated completion tests retain four separate options');
select is((select count(*)::integer from jsonb_array_elements(public.get_preview_offering_availability()) a
  where (a->>'repeatableScenario')::boolean and a->>'remaining'='1'),3,'showcase sample displays retain their last-slot setup');
reset role;

update demo_private.funding_config set preview_entries_enabled=false where singleton;
set local role anon;
select is(public.get_preview_offering_availability(),'[]'::jsonb,'disabled demo configuration exposes no active availability');
reset role;
select * from finish();
rollback;
