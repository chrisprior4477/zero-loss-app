-- Isolated fixtures; safe to execute on development-test with rollback.
begin;
create extension if not exists pgtap;
select no_plan();
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,preview_entries_enabled=true,
  winner_verification_required=false,entry_recovery_required=false,entry_undo_required=false,
  preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('98989898-9898-4898-8898-989898989891','reward-access-owner@example.test',now(),'{"legal_first_name":"Reward","legal_last_name":"Owner","date_of_birth":"1990-01-01"}'),
  ('98989898-9898-4898-8898-989898989892','reward-access-other@example.test',now(),'{"legal_first_name":"Reward","legal_last_name":"Other","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified'
  where id in ('98989898-9898-4898-8898-989898989891','98989898-9898-4898-8898-989898989892');
select demo_private.ensure_preview_customer_for('98989898-9898-4898-8898-989898989891');
select demo_private.ensure_preview_customer_for('98989898-9898-4898-8898-989898989892');
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,forced_outcome)
values ('reward-access-win','Reward access win','Example','Test','/test.png',2500,100,100,'winner'),
  ('reward-access-buy','Reward access purchase','Example','Test','/test.png',2500,100,100,'not_selected');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
select 'len_98989898989848988898989898989891',customer_id,'DEPOSIT','PLAYABLE',100000,'USD','reward_access_test_deposit',id,'demo'
from public.wallet_accounts where customer_id='98989898-9898-4898-8898-989898989891' and closed_at is null;
set local role authenticated;
select set_config('request.jwt.claim.sub','98989898-9898-4898-8898-989898989891',true);
select set_config('request.jwt.claims','{"sub":"98989898-9898-4898-8898-989898989891","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select public.create_preview_entry('reward-access-buy','reward_access_buy_entry_01');
select public.purchase_preview_gift_card((select c.id from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='reward-access-buy'),'reward_access_purchase_01');
select public.create_preview_entry('reward-access-buy','reward_access_buy_entry_02');
select public.purchase_preview_gift_card((select c.id from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='reward-access-buy' and not exists(select 1 from public.customer_orders o where o.completion_option_id=c.id)),'reward_access_purchase_02');
select is((select count(*)::integer from jsonb_array_elements(public.get_account_orders()) x where x->>'reward_slug'='reward-access-buy'),2,'same product can have two orders');
select is((select count(distinct x->>'reward_id')::integer from jsonb_array_elements(public.get_account_orders()) x),2,'orders expose two distinct exact reward IDs');
select ok((select bool_and(exists(select 1 from public.customer_orders o where o.order_number=x->>'order_number' and o.reward_id=(x->>'reward_id')::uuid)) from jsonb_array_elements(public.get_account_orders()) x),'every order opens its own saved reward');

select set_config('test.reward',(public.create_preview_entry('reward-access-win','reward_access_win_entry_01')->>'rewardId'),true);
select is(public.get_claimed_reward(current_setting('test.reward')::uuid),null::jsonb,'unclaimed code is withheld');
select is(public.claim_preview_reward(current_setting('test.reward')::uuid,'reward_access_claim_01')->>'duplicate','false','first claim succeeds once');
select is(public.claim_preview_reward(current_setting('test.reward')::uuid,'reward_access_claim_01')->>'duplicate','true','same request retry is idempotent');
select is(public.claim_preview_reward(current_setting('test.reward')::uuid,'reward_access_claim_02')->>'duplicate','true','new-key repeat still uses existing claim');
select is((select count(*)::integer from public.reward_events where reward_id=current_setting('test.reward')::uuid and event_type='claimed'),1,'retries preserve one claim');
select is(public.get_claimed_reward(current_setting('test.reward')::uuid)->>'redeemable','false','valid demo code remains non-redeemable');

-- Each fixture has an original claim plus a later lifecycle event. A loop
-- avoids changing any stored event in place; all fixture history is additive.
reset role;
create temporary table reward_access_checks(line text) on commit drop;
grant insert,select on reward_access_checks to authenticated;
set local role authenticated;
do $checks$
declare s text; rid uuid; claim_key text;
begin
  foreach s in array array['expired','cancelled','redeemed','issuance_pending','issuance_failed'] loop
    rid := (public.create_preview_entry('reward-access-win','reward_access_'||s||'_entry')->>'rewardId')::uuid;
    claim_key := 'reward_access_'||s||'_claim';
    perform public.claim_preview_reward(rid,claim_key);
    -- Event recording below is a test administrator operation, never a
    -- permission offered to customer code.
    perform set_config('test.'||s,rid::text,true);
    if s in ('expired','cancelled') then
      perform set_config('test.unclaimed_'||s,(public.create_preview_entry('reward-access-win','reward_access_'||s||'_unclaimed')->>'rewardId'),true);
    end if;
  end loop;
end $checks$;
reset role;
insert into public.reward_events(reward_id,customer_id,event_type,idempotency_key,reason)
select current_setting('test.'||s)::uuid,'98989898-9898-4898-8898-989898989891',s,'reward_access_state_'||s,'Rollback-only lifecycle test'
from unnest(array['expired','cancelled','redeemed','issuance_pending','issuance_failed']) s;
insert into public.reward_events(reward_id,customer_id,event_type,idempotency_key,reason)
select current_setting('test.unclaimed_'||s)::uuid,'98989898-9898-4898-8898-989898989891',s,'reward_access_unclaimed_'||s,'Rollback-only lifecycle test'
from unnest(array['expired','cancelled']) s;
set local role authenticated;
do $checks$
declare s text; rid uuid;
begin
  foreach s in array array['expired','cancelled','redeemed','issuance_pending','issuance_failed'] loop
    rid := current_setting('test.'||s)::uuid;
    insert into reward_access_checks select is(public.get_claimed_reward(rid),null::jsonb,s||' read withholds code');
    insert into reward_access_checks select throws_ok(format('select public.claim_preview_reward(%L::uuid,%L)',rid,'reward_access_'||s||'_claim'),'P0001',null,s||' same-key replay cannot return a code');
    insert into reward_access_checks select throws_ok(format('select public.claim_preview_reward(%L::uuid,%L)',rid,'reward_access_'||s||'_newkey'),'P0001',null,s||' new-key retry cannot return a code');
    insert into reward_access_checks select is((select count(*)::integer from public.reward_events where reward_id=rid and event_type='claimed'),1,s||' preserves original claim history');
    if s in ('expired','cancelled') then
      insert into reward_access_checks select throws_ok(format('select public.claim_preview_reward(%L::uuid,%L)',current_setting('test.unclaimed_'||s),'reward_access_'||s||'_firstclaim'),'P0001',null,s||' cannot be claimed for the first time');
    end if;
  end loop;
end $checks$;
select line from reward_access_checks;

select set_config('request.jwt.claim.sub','98989898-9898-4898-8898-989898989892',true);
select set_config('request.jwt.claims','{"sub":"98989898-9898-4898-8898-989898989892","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.get_account_orders(),'[]'::jsonb,'another customer cannot read these orders');
select throws_ok($$select public.claim_preview_reward(current_setting('test.reward')::uuid,'reward_access_claim_01')$$,'42501',null,'another customer cannot replay the owner claim');
select throws_ok($$select public.get_claimed_reward(current_setting('test.reward')::uuid)$$,'42501',null,'another customer cannot read the code');
reset role;
select is((select count(*)::integer from demo_private.reward_credentials where reward_id=current_setting('test.reward')::uuid),1,'normal retries retain one credential');
update public.demo_payment_accounts set enabled=false where customer_id='98989898-9898-4898-8898-989898989891';
set local role authenticated;
select set_config('request.jwt.claim.sub','98989898-9898-4898-8898-989898989891',true);
select set_config('request.jwt.claims','{"sub":"98989898-9898-4898-8898-989898989891","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select throws_ok($$select public.claim_preview_reward(current_setting('test.reward')::uuid,'reward_access_claim_01')$$,'42501',null,'old request cannot bypass disabled wallet access');
select throws_ok($$select public.get_claimed_reward(current_setting('test.reward')::uuid)$$,'42501',null,'disabled wallet cannot read a saved code');
reset role;
select * from finish();
rollback;
