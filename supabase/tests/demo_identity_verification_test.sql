begin;
create extension if not exists pgtap;
select no_plan();
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,preview_entries_enabled=true,
  winner_verification_required=false,entry_undo_required=false,
  preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('97999999-9999-4999-8999-999999999971','identity-owner@example.test',now(),'{"legal_first_name":"Identity","legal_last_name":"Owner","date_of_birth":"1990-01-01"}'),
  ('97999999-9999-4999-8999-999999999972','identity-other@example.test',now(),'{"legal_first_name":"Identity","legal_last_name":"Other","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id in ('97999999-9999-4999-8999-999999999971','97999999-9999-4999-8999-999999999972');
select demo_private.ensure_preview_customer_for('97999999-9999-4999-8999-999999999971');
select demo_private.ensure_preview_customer_for('97999999-9999-4999-8999-999999999972');
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,forced_outcome)
 values('identity-winner-test','Identity sample win','Example','Test','/test.png',2500,100,100,'winner'),
 ('identity-purchase-test','Identity sample purchase','Example','Test','/test.png',200,100,100,'not_selected');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
 select 'len_97999999999949998999999999999971',customer_id,'DEPOSIT','PLAYABLE',10000,'USD','identity_test_deposit',id,'demo'
 from public.wallet_accounts where customer_id='97999999-9999-4999-8999-999999999971' and closed_at is null;
set local role authenticated;
select set_config('request.jwt.claim.sub','97999999-9999-4999-8999-999999999971',true);
select set_config('request.jwt.claims','{"sub":"97999999-9999-4999-8999-999999999971","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select set_config('test.old_reward',(public.create_preview_entry('identity-winner-test','identity_legacy_entry_001')->>'rewardId'),true);
select public.claim_preview_reward(current_setting('test.old_reward')::uuid,'identity_legacy_claim_001');
select set_config('test.reward',(public.create_preview_entry('identity-winner-test','identity_new_entry_0001')->>'rewardId'),true);
select public.create_preview_entry('identity-purchase-test','identity_purchase_entry_001');
reset role;
update demo_private.funding_config set winner_verification_required=true where singleton;
set local role authenticated;
select throws_ok($$select public.claim_preview_reward(current_setting('test.reward')::uuid,'identity_new_claim_0001')$$,'P0001',null,'claim blocked before identity check');
select is(public.get_claimed_reward(current_setting('test.reward')::uuid),null::jsonb,'unclaimed credential cannot be revealed');
select lives_ok($$select public.claim_preview_reward(current_setting('test.old_reward')::uuid,'identity_legacy_claim_002')$$,'existing claims preserved without retroactive verification');
select lives_ok($$select public.purchase_preview_gift_card((select c.id from public.completion_options c join public.customer_entries e on e.id=c.customer_entry_id where e.offering_slug='identity-purchase-test'),'identity_purchase_req_001')$$,'completion purchase is not gated as a winner claim');
select set_config('test.verification',public.begin_demo_identity_verification(current_setting('test.reward')::uuid)->>'id',true);
select is(public.begin_demo_identity_verification(current_setting('test.reward')::uuid)->>'id',current_setting('test.verification'),'opening twice resumes one durable session');
select is((select count(*)::integer from public.customer_verifications),1,'one session recorded');
select throws_ok($$select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'demo_passed','sample-adult-v1')$$,'P0001',null,'cannot skip directly to successful verification');
select throws_ok($$select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'consent','real-document')$$,'22023',null,'arbitrary evidence cannot be submitted');
select is(public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'consent','sample-adult-v1')->>'step','consent','consent recorded');
select is(public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'consent','sample-adult-v1')->>'step','consent','step retry is idempotent');
select is(public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'details','sample-adult-v1')->>'step','details','sample details step recorded');
select is(public.begin_demo_identity_verification(current_setting('test.reward')::uuid)->>'step','details','reopening resumes exact progress');
select is(public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'document_front','sample-adult-v1')->>'step','document_front','front step recorded');
select is(public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'document_back','sample-adult-v1')->>'step','document_back','back step recorded');
select is(public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'selfie','sample-adult-v1')->>'step','selfie','headshot sample step recorded');
select is(public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'submitted','sample-adult-v1')->>'step','submitted','review submitted');
select is(public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'requires_input','sample-adult-v1')->>'step','requires_input','failed sample preserved');
select throws_ok($$select public.claim_preview_reward(current_setting('test.reward')::uuid,'identity_new_claim_0001')$$,'P0001',null,'failed check never unlocks reward');
select throws_ok($$select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'demo_passed','sample-adult-v1')$$,'P0001',null,'failure cannot be rewritten as passed');
select set_config('test.failed',current_setting('test.verification'),true);
select set_config('test.verification',public.begin_demo_identity_verification(current_setting('test.reward')::uuid)->>'id',true);
select isnt(current_setting('test.verification'),current_setting('test.failed'),'retry creates a separate audit attempt');
select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'consent','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'details','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'document_front','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'document_back','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'selfie','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'submitted','sample-adult-v1');
select is(public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'demo_passed','sample-adult-v1')->>'step','demo_passed','complete sample flow is explicitly demo passed');
select is(public.claim_preview_reward(current_setting('test.reward')::uuid,'identity_new_claim_0001')->>'status','claimed','database permits claim after demo confirmation');
select is(public.claim_preview_reward(current_setting('test.reward')::uuid,'identity_new_claim_0001')->>'duplicate','true','claim replay remains idempotent');
select is(public.get_claimed_reward(current_setting('test.reward')::uuid)->>'redeemable','false','result remains a non-redeemable demo reward');
select set_config('test.second_reward',public.create_preview_entry('identity-winner-test','identity_next_entry_001')->>'rewardId',true);
select is(public.claim_preview_reward(current_setting('test.second_reward')::uuid,'identity_next_claim_001')->>'status','claimed','next win uses same successful demo policy');
select is((select verification_status from public.customers where id=auth.uid()),'email_verified','demo does not change real account verification status');

-- A repeatable sample winner can be removed from the current presentation,
-- but prior claims and verification events are never deleted or rewritten.
select set_config('test.repeatable_reward',public.create_preview_entry('samsung-m70h-tv','identity_repeatable_entry_001')->>'rewardId',true);
select is(public.claim_preview_reward(current_setting('test.repeatable_reward')::uuid,'identity_repeatable_claim_001')->>'status','claimed','passed check permits the first repeatable sample claim');
select is(public.restart_preview_reward(current_setting('test.repeatable_reward')::uuid,'identity_repeatable_restart_001')->>'status','restarted','winner reward restart starts a new presentation cycle');
select is(public.claim_preview_reward(current_setting('test.repeatable_reward')::uuid,'identity_repeatable_claim_001')->>'duplicate','true','already claimed reward remains claimed after the presentation restart');
select set_config('test.after_restart_reward',public.create_preview_entry('samsung-m70h-tv','identity_repeatable_entry_002')->>'rewardId',true);
select throws_ok($$select public.claim_preview_reward(current_setting('test.after_restart_reward')::uuid,'identity_repeatable_claim_002')$$,'P0001',null,'new winner claim requires a fresh sample pass after reward restart');
select set_config('test.after_restart_verification',public.begin_demo_identity_verification(current_setting('test.after_restart_reward')::uuid)->>'id',true);
select isnt(current_setting('test.after_restart_verification'),current_setting('test.verification'),'new presentation starts a new immutable verification session');
select is(public.begin_demo_identity_verification(current_setting('test.after_restart_reward')::uuid)->>'id',current_setting('test.after_restart_verification'),'opening again resumes the new session');
select is(public.begin_demo_identity_verification(current_setting('test.after_restart_reward')::uuid)->>'step','start','previous passed session does not skip the walkthrough');
select public.advance_demo_identity_verification(current_setting('test.after_restart_verification')::uuid,'consent','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.after_restart_verification')::uuid,'details','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.after_restart_verification')::uuid,'document_front','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.after_restart_verification')::uuid,'document_back','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.after_restart_verification')::uuid,'selfie','sample-adult-v1');
select public.advance_demo_identity_verification(current_setting('test.after_restart_verification')::uuid,'submitted','sample-adult-v1');
select is(public.advance_demo_identity_verification(current_setting('test.after_restart_verification')::uuid,'demo_passed','sample-adult-v1')->>'step','demo_passed','fresh demo pass is saved without changing the earlier pass');
select is(public.claim_preview_reward(current_setting('test.after_restart_reward')::uuid,'identity_repeatable_claim_002')->>'status','claimed','new reward is claimable after the fresh pass');
select is((select count(*)::integer from public.customer_verification_events where customer_id=auth.uid() and step='demo_passed'),2,'both passed results remain in immutable history');

-- Presentation shortcut is recorded distinctly from completing sample steps.
select is(public.restart_preview_reward(current_setting('test.after_restart_reward')::uuid,'identity_repeatable_restart_002')->>'status','restarted','second restart begins a fresh presentation cycle');
select set_config('test.skip_reward',public.create_preview_entry('samsung-m70h-tv','identity_repeatable_entry_003')->>'rewardId',true);
select throws_ok($$select public.claim_preview_reward(current_setting('test.skip_reward')::uuid,'identity_repeatable_claim_003')$$,'P0001',null,'new winner still requires a demo result before shortcut');
select set_config('test.skip_verification',public.begin_demo_identity_verification(current_setting('test.skip_reward')::uuid)->>'id',true);
select is(public.advance_demo_identity_verification(current_setting('test.skip_verification')::uuid,'consent','sample-adult-v1')->>'step','consent','presentation can stop after the sample consent screen');
select throws_ok($$select public.skip_demo_identity_for_presentation(current_setting('test.skip_reward')::uuid,current_setting('test.verification')::uuid)$$,'42501',null,'shortcut rejects an old presentation session');
select is(public.skip_demo_identity_for_presentation(current_setting('test.skip_reward')::uuid,current_setting('test.skip_verification')::uuid)->>'step','demo_skipped','shortcut records an honest terminal demo-skipped result');
select is(public.skip_demo_identity_for_presentation(current_setting('test.skip_reward')::uuid,current_setting('test.skip_verification')::uuid)->>'step','demo_skipped','shortcut retry is idempotent');
select is((select count(*)::integer from public.customer_verification_events where verification_id=current_setting('test.skip_verification')::uuid and step='demo_skipped'),1,'only one skip audit event exists');
select is((select count(*)::integer from public.customer_verification_events where verification_id=current_setting('test.skip_verification')::uuid and step='demo_passed'),0,'skip never masquerades as a passed check');
select is(public.claim_preview_reward(current_setting('test.skip_reward')::uuid,'identity_repeatable_claim_003')->>'status','claimed','demo winner can be claimed after explicit presentation shortcut');
select is(public.get_claimed_reward(current_setting('test.skip_reward')::uuid)->>'redeemable','false','shortcut never issues a redeemable reward');
select is((select verification_status from public.customers where id=auth.uid()),'email_verified','shortcut never upgrades real identity status');
select set_config('test.after_skip_replay',public.restart_demo_identity_verification(current_setting('test.skip_reward')::uuid)->>'id',true);
select isnt(current_setting('test.after_skip_replay'),current_setting('test.skip_verification'),'full walkthrough replay starts a fresh session after shortcut');

select set_config('test.replay',public.restart_demo_identity_verification(current_setting('test.reward')::uuid)->>'id',true);
select isnt(current_setting('test.replay'),current_setting('test.verification'),'replay starts a new sample session, preserving the successful one');
select is(public.restart_demo_identity_verification(current_setting('test.reward')::uuid)->>'id',current_setting('test.replay'),'double-clicking replay resumes the same new session');
select is(public.claim_preview_reward(current_setting('test.reward')::uuid,'identity_new_claim_0001')->>'duplicate','true','replay does not invalidate existing claim');
select throws_ok($$update public.customer_verifications set provider='live' where id=current_setting('test.verification')::uuid$$,'42501',null,'client cannot upgrade to a real provider');
select throws_ok($$insert into public.customer_verification_events(verification_id,customer_id,step,sequence) values(current_setting('test.verification')::uuid,auth.uid(),'demo_passed',8)$$,'42501',null,'client cannot forge audit events');
select set_config('request.jwt.claim.sub','97999999-9999-4999-8999-999999999972',true);
select set_config('request.jwt.claims','{"sub":"97999999-9999-4999-8999-999999999972","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is((select count(*)::integer from public.customer_verifications),0,'other customer cannot read sessions');
select is((select count(*)::integer from public.customer_verification_events),0,'other customer cannot read events');
select throws_ok($$select public.begin_demo_identity_verification(current_setting('test.reward')::uuid)$$,'42501',null,'cannot start another customer winner check');
select throws_ok($$select public.restart_demo_identity_verification(current_setting('test.reward')::uuid)$$,'42501',null,'cannot replay another customer winner check');
select throws_ok($$select public.advance_demo_identity_verification(current_setting('test.verification')::uuid,'consent','sample-adult-v1')$$,'42501',null,'cannot advance another customer check');
select throws_ok($$select public.skip_demo_identity_for_presentation(current_setting('test.skip_reward')::uuid,current_setting('test.skip_verification')::uuid)$$,'42501',null,'cannot use another customer presentation shortcut');
select set_config('request.jwt.claims','{"sub":"97999999-9999-4999-8999-999999999972","iss":"https://other.supabase.co/auth/v1"}',true);
select throws_ok($$select public.begin_demo_identity_verification(current_setting('test.reward')::uuid)$$,'42501',null,'wrong environment blocked');
select throws_ok($$select public.skip_demo_identity_for_presentation(current_setting('test.skip_reward')::uuid,current_setting('test.skip_verification')::uuid)$$,'42501',null,'presentation shortcut is blocked outside the demo environment');
reset role;
select throws_ok($$delete from public.customer_verifications where id=current_setting('test.verification')::uuid$$,'55000',null,'session history cannot be deleted by ordinary owner SQL');
select throws_ok($$update public.customer_verification_events set step='cancelled' where verification_id=current_setting('test.verification')::uuid$$,'55000',null,'event history is immutable');
select is((select count(*)::integer from public.customer_verification_events where verification_id=current_setting('test.verification')::uuid),7,'exactly seven steps saved without duplicate events');
select is((select count(*)::integer from information_schema.columns where table_schema='public' and table_name in ('customer_verifications','customer_verification_events') and column_name in ('ssn','tax_number','document','document_image','video','selfie','legal_name')),0,'schema stores progress metadata, not documents or identity numbers');
select * from finish();
rollback;
