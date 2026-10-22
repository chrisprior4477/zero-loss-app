begin;
create extension if not exists pgtap;
select no_plan();

update demo_private.funding_config set enabled=true, preview_provisioning_enabled=true,
  preview_entries_enabled=true, entry_undo_required=true, funding_reauth_required=true,
  environment='development-test', preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
  where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('a1111111-2222-4333-8444-555555555551','unlimited-policy@example.test',now(),
   '{"legal_first_name":"Policy","legal_last_name":"Test","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified'
  where id='a1111111-2222-4333-8444-555555555551';
select demo_private.ensure_preview_customer_for('a1111111-2222-4333-8444-555555555551');
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,
  value_cents,entry_price_cents,capacity,sample_entries,forced_outcome,repeatable_scenario)
  values('purchase-policy-test','Policy test','Test','Test','/test.png',100000,100,3000,0,'active',false);
create temporary table policy_state(key text primary key, value jsonb);
grant all on policy_state to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-2222-4333-8444-555555555551',true);
select set_config('request.jwt.claims','{"sub":"a1111111-2222-4333-8444-555555555551","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);

select lives_ok($test$
do $funding$
declare i integer; k text; s public.demo_funding_sessions; receipt jsonb;
begin
  for i in 1..25 loop
    k := 'policy_deposit_key_' || i;
    perform public.confirm_demo_checkbox_funding(100000,k,'demo_card_4242',false,'funding-confirmation-v1');
    s := public.create_demo_card_funding_session(100000,k,'demo_card_4242',false);
    receipt := public.simulate_demo_payment(s.id);
    perform public.accept_demo_payment_event(receipt->>'body',receipt->>'signature');
    -- Retrying a completed deposit never creates a second credit.
    perform public.create_demo_card_funding_session(100000,k,'demo_card_4242',false);
    perform public.accept_demo_payment_event(receipt->>'body',receipt->>'signature');
  end loop;
end $funding$;
$test$, '25 rapid $1,000 deposits and exact retries succeed without demo quotas');
select is(public.get_wallet_snapshot()->>'balanceCents','2500000','exact $25,000 balance, not doubled by retries');
select is((select count(*)::integer from public.ledger_entries where entry_type='DEPOSIT'),25,'one ledger credit per deposit');
select is(jsonb_array_length(public.get_demo_funding_requests()),25,'large deposits remain readable in recovery/history');
select throws_ok($$select public.create_demo_card_funding_session(100001,'policy_deposit_key_1','demo_card_4242',false)$$,
  '22023',null,'a retry cannot change its deposit amount');

insert into policy_state values('first',public.submit_preview_entries('purchase-policy-test',125,'policy_ticket_batch_1',false,null));
select is((select value->>'quantity' from policy_state where key='first'),'125','a batch can exceed 10 and the old daily 100');
select is(public.get_wallet_snapshot()->>'balanceCents','2487500','exact batch total reserved');
select is(public.submit_preview_entries('purchase-policy-test',125,'policy_ticket_batch_1',false,null)->>'duplicate','true','retry does not reserve twice');
select is(public.confirm_preview_entry_request((select (value->>'requestId')::uuid from policy_state where key='first'))->>'status','accepted','125 tickets finalize');
insert into policy_state values('second',public.submit_preview_entries('purchase-policy-test',125,'policy_ticket_batch_2',true,
  (select (value->>'requestId')::uuid from policy_state where key='first')));
select is(public.confirm_preview_entry_request((select (value->>'requestId')::uuid from policy_state where key='second'))->>'status','accepted','another rapid 125-ticket purchase succeeds');
select is((select count(*)::integer from public.customer_entries),250,'all 250 tickets persist');
select is((select count(*)::integer from public.crew_entry_shares),125,'sharing stays per ticket');
select is(public.get_wallet_snapshot()->>'balanceCents','2475000','exact $250 debit for 250 tickets');
select throws_ok($$select public.submit_preview_entries('purchase-policy-test',2751,'policy_excess_capacity',false,
  (select (value->>'requestId')::uuid from policy_state where key='second'))$$,
  'P0001','There are not enough entries remaining for that quantity.','actual prize capacity is still enforced');
select throws_ok($$select public.submit_preview_entries('purchase-policy-test',0,'policy_invalid_quantity',false,null)$$,
  '22023',null,'zero-ticket requests remain invalid');
select throws_ok($$select public.clear_demo_playable_balance(2474900,'policy_balance_clear')$$,
  'P0001',null,'stale balance confirmation cannot clear funds');
select is(public.clear_demo_playable_balance(2475000,'policy_balance_clear')->>'clearedCents','2475000','clearing funds works after more than 100 rapid entries');
select is(public.clear_demo_playable_balance(2475000,'policy_balance_clear')->>'alreadyApplied','true','clearing is idempotent');
select is(public.get_wallet_snapshot()->>'balanceCents','0','cleared wallet derives zero from ledger');
select is((select count(*)::integer from public.customer_entries),250,'clearing funds preserves every ticket');
select is((select count(*)::integer from public.ledger_entries where entry_type='DEPOSIT'),25,'clearing preserves original deposit history');
select throws_ok($$select public.submit_preview_entries('purchase-policy-test',1,'policy_no_balance_key',false,
  (select (value->>'requestId')::uuid from policy_state where key='second'))$$,
  'P0001','Add demo funds before entering this quantity.','wallet balance still enforced');
set local role anon;
select throws_ok($$select public.submit_preview_entries('purchase-policy-test',125,'policy_anonymous_key',false,null)$$,
  '42501',null,'anonymous entry purchases remain blocked');
select throws_ok($$select public.create_demo_funding_session(100000,'policy_anonymous_fund')$$,
  '42501',null,'anonymous deposits remain blocked');
reset role;
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','demo_private') and p.prosrc ~ 'Demo limit:'),0,'no active writer retains a demo quota');
select * from finish();
rollback;
