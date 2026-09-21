begin;
create extension if not exists pgtap;
select no_plan();

update demo_private.funding_config set
  enabled=true,
  preview_provisioning_enabled=true,
  preview_entries_enabled=true,
  preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
where singleton;

insert into demo_private.preview_entry_offerings(
  slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,forced_outcome
) values
  ('samsung-m70h-tv','Samsung TV','Best Buy','Electronics','/tv.png',40000,100,1200,'winner'),
  ('nike-court-shot-shoes','Nike Shoes','Dick''s Sporting Goods','Shoes','/shoes.png',7500,100,225,'not_selected'),
  ('babys-essentials-bundle','Baby Bundle','Walmart','Baby','/baby.png',10000,100,300,'not_selected'),
  ('active-product-one','Active One','Retailer','Everyday','/one.png',2500,100,75,'active'),
  ('active-product-two','Active Two','Retailer','Everyday','/two.png',2500,100,75,'active'),
  ('active-product-three','Active Three','Retailer','Everyday','/three.png',2500,100,75,'active'),
  ('active-product-four','Active Four','Retailer','Everyday','/four.png',2500,100,75,'active'),
  ('active-product-five','Active Five','Retailer','Everyday','/five.png',2500,100,75,'active')
on conflict (slug) do update set
  title=excluded.title,retailer=excluded.retailer,category=excluded.category,
  image_path=excluded.image_path,value_cents=excluded.value_cents,
  entry_price_cents=excluded.entry_price_cents,capacity=excluded.capacity,
  forced_outcome=excluded.forced_outcome,active=true;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('99999999-9999-4999-8999-999999999991','entry-one@example.test',now(),'{"legal_first_name":"Entry","legal_last_name":"One","date_of_birth":"1990-01-01"}'::jsonb),
  ('99999999-9999-4999-8999-999999999992','entry-two@example.test',now(),'{"legal_first_name":"Entry","legal_last_name":"Two","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status='active',verification_status='email_verified'
where id in ('99999999-9999-4999-8999-999999999991','99999999-9999-4999-8999-999999999992');
select demo_private.ensure_preview_customer_for('99999999-9999-4999-8999-999999999991');
select demo_private.ensure_preview_customer_for('99999999-9999-4999-8999-999999999992');

insert into public.ledger_entries(
  ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope
)
select 'len_99999999999949998999999999999991',w.customer_id,'DEPOSIT','PLAYABLE',10000,'USD','entry_test_deposit_1',w.id,'demo'
from public.wallet_accounts w where w.customer_id='99999999-9999-4999-8999-999999999991' and w.closed_at is null;

set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999991',true);
select set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999991","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);

select is(public.create_preview_entry('samsung-m70h-tv','entry_idempotency_key_01')->>'status','winner','TV receives the configured stored win');
select is(public.get_wallet_snapshot()->>'balanceCents','9900','entry debit updates the authoritative balance exactly once');
select is(public.create_preview_entry('samsung-m70h-tv','entry_idempotency_key_01')->>'duplicate','true','exact replay is idempotent');
select is(public.create_preview_entry('samsung-m70h-tv','entry_idempotency_key_01')->>'entryId',
  (select entry_id from public.customer_entries where offering_slug='samsung-m70h-tv'), 'winner receipt identifies its exact entry');
select is(public.create_preview_entry('samsung-m70h-tv','entry_idempotency_key_01')->>'rewardId',
  (select id::text from public.customer_rewards), 'winner receipt identifies its exact wallet reward');
select is(public.get_wallet_snapshot()->>'balanceCents','9900','idempotent replay cannot debit twice');
select throws_ok($$ select public.create_preview_entry('nike-court-shot-shoes','entry_idempotency_key_01') $$,'22023',null,'altered replay is rejected');
select is(public.create_preview_entries('nike-court-shot-shoes',3,'entry_quantity_batch_key_03')->>'quantity','3','a selected quantity creates one recorded batch');
select is(public.create_preview_entries('nike-court-shot-shoes',3,'entry_quantity_batch_key_03')->>'status','not_selected','every entry in the Nike batch receives its configured outcome');
select is(public.create_preview_entries('nike-court-shot-shoes',3,'entry_quantity_batch_key_03')->>'duplicate','true','an exact batch replay is idempotent');
select is(public.create_preview_entries('nike-court-shot-shoes',3,'entry_quantity_batch_key_03')->>'entryId',
  (select entry_id from public.customer_entries where offering_slug='nike-court-shot-shoes' order by created_at,id limit 1),
  'multi-entry receipt consistently identifies a saved entry in that batch');
select is(public.create_preview_entries('nike-court-shot-shoes',3,'entry_quantity_batch_key_03')->>'rewardId', null::text,
  'non-selected receipts do not invent a wallet reward');
select throws_ok($$ select public.create_preview_entries('nike-court-shot-shoes',2,'entry_quantity_batch_key_03') $$,'22023',null,'a batch replay cannot change quantity');
select is(public.get_wallet_snapshot()->>'balanceCents','9600','three entries create three authoritative debits');
select is((select count(*)::integer from public.customer_entries where offering_slug='nike-court-shot-shoes'),3,'three entries are stored independently');
select is((select count(*)::integer from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='nike-court-shot-shoes'),3,'three non-selected entries create three separate completion options');

select is(public.create_preview_entry('babys-essentials-bundle','entry_idempotency_key_04')->>'status','not_selected','baby bundle receives the configured stored non-selected outcome');
select is((select count(*)::integer from public.customer_rewards),1,'winner creates one preview reward record');
select is((select count(*)::integer from public.completion_options),4,'non-selected entries create four separate completion options');
select is((select min(remaining_cents) from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='nike-court-shot-shoes'),7400,'Nike completion options preserve their exact remaining amount');
select is((select remaining_cents from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='babys-essentials-bundle'),9900,'baby completion option preserves its exact remaining amount');
select is((select count(*)::integer from jsonb_array_elements(public.get_account_activity()) a where a->>'status'='prize'),1,'activity exposes one stored prize');
select is((select count(*)::integer from jsonb_array_elements(public.get_account_activity()) a where a->>'status'='completion'),4,'activity exposes four stored purchase options');
select is((select count(*)::integer from jsonb_array_elements(public.get_preview_entry_reconciliation()) a where a->>'reconciliation'='reconciled'),5,'all entry financial and outcome records reconcile');

select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999992',true);
select set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999992","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.get_account_activity(),'[]'::jsonb,'another customer cannot see the working account activity');
select is((select count(*)::integer from public.customer_entries),0,'entry table RLS hides another customer rows');
select throws_ok($$ select public.create_preview_entry('samsung-m70h-tv','entry_second_customer_01') $$,'P0001','Add demo funds before entering this quantity.','database rejects an unfunded entry');
select set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999992","iss":"https://wrong-project.supabase.co/auth/v1"}',true);
select throws_ok($$ select public.create_preview_entry('samsung-m70h-tv','entry_second_customer_02') $$,'42501',null,'wrong project issuer fails closed');
reset role;

select throws_ok($$ update public.customer_entries set amount=1 where customer_id='99999999-9999-4999-8999-999999999991' $$,'55000',null,'entry history is immutable');
select throws_ok($$ delete from public.entry_outcomes where customer_id='99999999-9999-4999-8999-999999999991' $$,'55000',null,'outcome history is immutable');
select throws_ok($$ delete from public.customer_rewards where customer_id='99999999-9999-4999-8999-999999999991' $$,'55000',null,'reward history is immutable');
select throws_ok($$ update public.completion_options set remaining_cents=0 where customer_id='99999999-9999-4999-8999-999999999991' $$,'55000',null,'completion history is immutable');

-- Seed nine recent entries directly for a dedicated customer, then prove the
-- tenth public request succeeds and the eleventh is stopped by the DB ceiling.
reset role;
insert into public.ledger_entries(
  ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope
)
select 'len_99999999999949998999999999999992',w.customer_id,'DEPOSIT','PLAYABLE',10000,'USD','entry_test_deposit_2',w.id,'demo'
from public.wallet_accounts w where w.customer_id='99999999-9999-4999-8999-999999999992' and w.closed_at is null;
insert into public.customer_entries(entry_id,customer_id,wallet_account_id,offering_slug,amount,idempotency_key,outcome_status)
select 'ent_'||lpad(n::text,32,'a'),w.customer_id,w.id,'active-product-one',100,'rate_limit_seed_key_0'||n,'active'
from public.wallet_accounts w cross join generate_series(1,9) n
where w.customer_id='99999999-9999-4999-8999-999999999992' and w.closed_at is null;
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999992',true);
select set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999992","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select lives_ok($$ select public.create_preview_entry('active-product-five','rate_limit_public_key_10') $$,'tenth entry in one minute is allowed');
select throws_ok($$ select public.create_preview_entry('samsung-m70h-tv','rate_limit_public_key_11') $$,'P0001','Demo limit: ten entries per minute.','eleventh rapid entry is rejected by the database');
reset role;

select * from finish();
rollback;
