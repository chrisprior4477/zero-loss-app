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
  ('lifecycle-winner-claim','Claim Reward','Retailer One','Test','/claim.png',5000,100,100,'winner'),
  ('lifecycle-winner-expire','Expiring Reward','Retailer Two','Test','/expire.png',6000,100,100,'winner'),
  ('lifecycle-option-buy','Buy Option','Retailer Three','Test','/buy.png',7500,100,100,'not_selected'),
  ('lifecycle-option-decline','Decline Option','Retailer Four','Test','/decline.png',10000,100,100,'not_selected')
on conflict (slug) do update set
  title=excluded.title,retailer=excluded.retailer,category=excluded.category,
  image_path=excluded.image_path,value_cents=excluded.value_cents,
  entry_price_cents=excluded.entry_price_cents,capacity=excluded.capacity,
  forced_outcome=excluded.forced_outcome,active=true;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('88888888-8888-4888-8888-888888888881','lifecycle-owner@example.test',now(),'{"legal_first_name":"Lifecycle","legal_last_name":"Owner","date_of_birth":"1990-01-01"}'::jsonb),
  ('88888888-8888-4888-8888-888888888882','lifecycle-other@example.test',now(),'{"legal_first_name":"Lifecycle","legal_last_name":"Other","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status='active',verification_status='email_verified'
where id in ('88888888-8888-4888-8888-888888888881','88888888-8888-4888-8888-888888888882');
select demo_private.ensure_preview_customer_for('88888888-8888-4888-8888-888888888881');
select demo_private.ensure_preview_customer_for('88888888-8888-4888-8888-888888888882');

insert into public.ledger_entries(
  ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope
)
select 'len_88888888888848888888888888888881',w.customer_id,'DEPOSIT','PLAYABLE',20000,'USD','lifecycle_deposit_1',w.id,'demo'
from public.wallet_accounts w where w.customer_id='88888888-8888-4888-8888-888888888881' and w.closed_at is null;

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888881',true);
select set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888881","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);

select is(public.create_preview_entry('lifecycle-winner-claim','lifecycle_entry_claim_01')->>'status','winner','winner entry is recorded');
select is(public.create_preview_entry('lifecycle-winner-expire','lifecycle_entry_expire_01')->>'status','winner','second winner entry is recorded');
select is(public.create_preview_entry('lifecycle-option-buy','lifecycle_entry_buy_01')->>'status','not_selected','purchase option entry is recorded');
select is(public.create_preview_entry('lifecycle-option-decline','lifecycle_entry_decline_01')->>'status','not_selected','decline option entry is recorded');

select is((select count(*)::integer from public.completion_option_reminders),'16','each 30-day option receives the eight approved reminder checkpoints');
select ok((select min(expires_at-created_at)>interval '30 days' from public.completion_options),'purchase-option deadline includes 30 full calendar days after Day 0');
select is(public.decline_purchase_option(
  (select c.id from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='lifecycle-option-decline'),
  'lifecycle_decline_request_01'
)->>'status','declined','customer can decline an owned option');
select is(public.decline_purchase_option(
  (select c.id from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='lifecycle-option-decline'),
  'lifecycle_decline_request_01'
)->>'duplicate','true','decline replay is idempotent');
select is((select count(*)::integer from public.ledger_entries where entry_type='REFUND' and customer_id='88888888-8888-4888-8888-888888888881'),0,'declining never refunds the entry amount');
select is((select count(*)::integer from public.completion_option_reminders where status='cancelled' and completion_option_id=(select c.id from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='lifecycle-option-decline')),8,'declining stops all pending reminders');

select is(public.purchase_preview_gift_card(
  (select c.id from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='lifecycle-option-buy'),
  'lifecycle_purchase_request_01'
)->>'status','purchased','verified preview balance completes a gift-card option');
select is(public.purchase_preview_gift_card(
  (select c.id from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='lifecycle-option-buy'),
  'lifecycle_purchase_request_01'
)->>'duplicate','true','purchase replay cannot charge twice');
select is((select count(*)::integer from public.ledger_entries where entry_type='PURCHASE_DEBIT'),1,'purchase creates one authoritative debit');
select is((select amount from public.ledger_entries where entry_type='PURCHASE_DEBIT'),-7400,'only the disclosed remaining amount is charged');
select is((select count(*)::integer from public.customer_orders),1,'purchase creates one gift-card order');
select is((select count(*)::integer from public.customer_rewards where source='purchase'),1,'purchase creates one retailer gift-card reward');
select is((select count(*)::integer from jsonb_array_elements(public.get_account_orders())),1,'owner order reader returns the gift-card order');

select is(public.claim_preview_reward(
  (select r.id from public.customer_rewards r join public.customer_entries e on e.id=r.customer_entry_id where e.offering_slug='lifecycle-winner-claim'),
  'lifecycle_claim_request_01'
)->>'status','claimed','winner can reveal an owned retailer gift card');
select matches((public.get_claimed_reward(
  (select r.id from public.customer_rewards r join public.customer_entries e on e.id=r.customer_entry_id where e.offering_slug='lifecycle-winner-claim')
)->>'code'),'^[0-9]{12}$','preview credential is a barcode-compatible 12-digit sample number');
select is(public.get_claimed_reward(
  (select r.id from public.customer_rewards r join public.customer_entries e on e.id=r.customer_entry_id where e.offering_slug='lifecycle-winner-claim')
)->>'redeemable','false','preview credential cannot be mistaken for redeemable value');

select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888882',true);
select set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888882","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.get_account_orders(),'[]'::jsonb,'another customer cannot read the owner order');
select throws_ok(
  $$ select public.get_claimed_reward((select r.id from public.customer_rewards r join public.customer_entries e on e.id=r.customer_entry_id where e.offering_slug='lifecycle-winner-claim')) $$,
  '42501',null,'another customer cannot reveal the owner credential'
);
reset role;

alter table public.customer_rewards disable trigger customer_rewards_immutable;
update public.customer_rewards r set created_at=now()-interval '100 days',claim_expires_at=now()-interval '1 minute'
from public.customer_entries e where e.id=r.customer_entry_id and e.offering_slug='lifecycle-winner-expire';
alter table public.customer_rewards enable trigger customer_rewards_immutable;
select is(public.process_expired_winner_rewards(10)->>'processed','1','service worker expires one unclaimed winner');
select is((select count(*)::integer from public.reward_events re join public.customer_rewards r on r.id=re.reward_id join public.customer_entries e on e.id=r.customer_entry_id where e.offering_slug='lifecycle-winner-expire' and re.event_type='expired'),1,'winner expiration is retained as immutable history');
select is((select count(*)::integer from public.ledger_entries where entry_type='UNCLAIMED_WINNER_CREDIT'),1,'unclaimed winner receives one playable-balance credit');
select is((select amount from public.ledger_entries where entry_type='UNCLAIMED_WINNER_CREDIT'),100,'the original entry amount is returned exactly');

select throws_ok($$ update public.reward_events set reason='changed' $$,'55000',null,'reward event history is immutable');
select throws_ok($$ delete from public.customer_orders $$,'55000',null,'order history is immutable');
select * from finish();
rollback;
