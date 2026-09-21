begin;
create extension if not exists pgtap;
select no_plan();
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,preview_entries_enabled=true,
  entry_undo_required=true,entry_recovery_required=true,preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('51515151-5151-4151-8151-515151515151','recovery-one@example.test',now(),'{"legal_first_name":"Recovery","legal_last_name":"One","date_of_birth":"1990-01-01"}'),
 ('52525252-5252-4252-8252-525252525252','recovery-two@example.test',now(),'{"legal_first_name":"Recovery","legal_last_name":"Two","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id in ('51515151-5151-4151-8151-515151515151','52525252-5252-4252-8252-525252525252');
select demo_private.ensure_preview_customer_for('51515151-5151-4151-8151-515151515151');
select demo_private.ensure_preview_customer_for('52525252-5252-4252-8252-525252525252');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
 select 'len_'||replace(gen_random_uuid()::text,'-',''),customer_id,'DEPOSIT','PLAYABLE',10000,'USD','recovery_test_funding',id,'demo'
 from public.wallet_accounts where customer_id in ('51515151-5151-4151-8151-515151515151','52525252-5252-4252-8252-525252525252') and scope='demo' and closed_at is null;
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries)
 values('recovery-audit','Recovery test','Test','Test','/test.png',2500,100,100,0);
-- Already-due fixture, without changing an existing deadline or exposing a
-- client clock override. No actual customer history is edited by these tests.
insert into public.entry_requests(id,customer_id,wallet_account_id,offering_slug,requested_quantity,unit_price_cents,idempotency_key,share_with_crew,requested_at,undo_until)
 select '53535353-5353-4353-8353-535353535353',customer_id,id,'recovery-audit',2,100,'recovery_original_key',false,statement_timestamp()-interval '1 day',statement_timestamp()-interval '1 day'+interval '30 seconds'
 from public.wallet_accounts where customer_id='51515151-5151-4151-8151-515151515151' and scope='demo' and closed_at is null;
insert into demo_private.entry_request_terms values('53535353-5353-4353-8353-535353535353',2500,'active');
select demo_private.post_entry_request_hold('53535353-5353-4353-8353-535353535353',false);
insert into public.entry_request_events(request_id,event_name,actor,reason_code) values('53535353-5353-4353-8353-535353535353','entry.requested','customer','undo_window');
select demo_private.resolve_entry_request('53535353-5353-4353-8353-535353535353',false);
create temporary table recovery_saved(value jsonb);
grant all on recovery_saved to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','51515151-5151-4151-8151-515151515151',true);
select set_config('request.jwt.claims','{"sub":"51515151-5151-4151-8151-515151515151","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.submit_preview_entries('recovery-audit',1,'recovery_new_page_key',true,null)->>'requestId','53535353-5353-4353-8353-535353535353','new page key returns original saved submission, not new quantity/privacy');
select is(public.get_wallet_snapshot()->>'balanceCents','9800','unknown-response recovery makes no additional debit');
select is((select count(*)::int from public.customer_entries),2,'only original two tickets exist');
select is(public.create_preview_entry('recovery-audit','recovery_legacy_key')->>'requestId','53535353-5353-4353-8353-535353535353','legacy single-entry caller cannot bypass recovery');
select is(public.create_preview_entries_with_sharing('recovery-audit',1,'recovery_legacy_batch',false)->>'requestId','53535353-5353-4353-8353-535353535353','legacy batch caller cannot bypass recovery');
select throws_ok($$select public.submit_preview_entries('recovery-audit',2,'recovery_new_page_key',true,null)$$,'22023',null,'same recovery key cannot change quantity');
select throws_ok($$select public.submit_preview_entries('recovery-audit',1,'recovery_new_page_key',false,null)$$,'22023',null,'same recovery key cannot change sharing');
select lives_ok($$select public.acknowledge_entry_receipt('53535353-5353-4353-8353-535353535353')$$,'owner can dismiss a completed receipt');
select lives_ok($$select public.acknowledge_entry_receipt('53535353-5353-4353-8353-535353535353')$$,'repeated acknowledgment is idempotent');
select is(public.list_preview_entry_requests(),'[]'::jsonb,'acknowledged receipt stays dismissed across devices');
select is(public.submit_preview_entries('recovery-audit',1,'recovery_dismiss_key',false,null)->>'requestId','53535353-5353-4353-8353-535353535353','dismissing does not authorize a stale page to charge again');
insert into recovery_saved select public.submit_preview_entries('recovery-audit',3,'recovery_intentional_key',false,'53535353-5353-4353-8353-535353535353');
select is((select value->>'status' from recovery_saved),'pending','explicit next submission with known predecessor is allowed');
select is(public.get_wallet_snapshot()->>'balanceCents','9500','new intentional three-ticket submission reserves exactly three dollars');
select is(public.submit_preview_entries('recovery-audit',3,'recovery_intentional_key',false,'53535353-5353-4353-8353-535353535353')->>'requestId',(select value->>'requestId' from recovery_saved),'retries return the same pending request');
select is(public.submit_preview_entries('recovery-audit',1,'recovery_second_tab_key',false,'53535353-5353-4353-8353-535353535353')->>'requestId',(select value->>'requestId' from recovery_saved),'second tab is directed to current pending request');
select throws_ok($$select public.acknowledge_entry_receipt((select (value->>'requestId')::uuid from recovery_saved))$$,'42501',null,'pending request cannot be dismissed');
select is(public.submit_preview_entries('recovery-audit',1,'recovery_new_page_key',true,null)->>'requestId','53535353-5353-4353-8353-535353535353','delayed replay stays linked to original even after a later submission');
select is(public.resolve_preview_entry_request((select (value->>'requestId')::uuid from recovery_saved),true)->>'status','cancelled','new request can still be undone');
select is(public.get_wallet_snapshot()->>'balanceCents','9800','Undo preserves original accepted charge');
select is(public.submit_preview_entries('recovery-audit',1,'recovery_stale_late_key',false,'53535353-5353-4353-8353-535353535353')->>'status','cancelled','stale tab cannot start another submission after current request resolves');
select set_config('request.jwt.claim.sub','52525252-5252-4252-8252-525252525252',true);
select set_config('request.jwt.claims','{"sub":"52525252-5252-4252-8252-525252525252","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.list_preview_entry_requests(),'[]'::jsonb,'other account sees no receipts');
select is((select count(*)::int from public.entry_request_receipt_acknowledgments),0,'acknowledgment RLS isolates accounts');
select throws_ok($$select public.acknowledge_entry_receipt('53535353-5353-4353-8353-535353535353')$$,'42501',null,'cannot dismiss another account receipt');
select throws_ok($$select public.submit_preview_entries('recovery-audit',1,'recovery_wrong_owner',false,'53535353-5353-4353-8353-535353535353')$$,'42501',null,'cannot use another account predecessor');
select throws_ok($$select demo_private.request_preview_entries_original('recovery-audit',1,'recovery_bypass_key',false)$$,'42501',null,'unguarded implementation cannot be called by customer');
reset role;
-- A completed receipt older than the former two-minute cutoff remains visible.
insert into public.entry_requests(id,customer_id,wallet_account_id,offering_slug,requested_quantity,unit_price_cents,idempotency_key,share_with_crew,requested_at,undo_until,status,resolved_at,reason_code)
 select '54545454-5454-4454-8454-545454545454',customer_id,id,'recovery-audit',1,100,'recovery_old_cancelled',false,now()-interval '2 days',now()-interval '2 days'+interval '30 seconds','cancelled',now()-interval '2 days'+interval '10 seconds','customer_undo'
 from public.wallet_accounts where customer_id='52525252-5252-4252-8252-525252525252' and scope='demo' and closed_at is null;
select demo_private.post_entry_request_hold('54545454-5454-4454-8454-545454545454',false);
select demo_private.post_entry_request_hold('54545454-5454-4454-8454-545454545454',true);
set local role authenticated;
select is(public.list_preview_entry_requests()->0->>'requestId','54545454-5454-4454-8454-545454545454','unacknowledged receipt survives two days, not only two minutes');
select throws_ok($$insert into public.entry_request_receipt_acknowledgments(request_id,customer_id) values('53535353-5353-4353-8353-535353535353',auth.uid())$$,'42501',null,'clients cannot write arbitrary acknowledgments');
reset role;
select throws_ok($$delete from public.entry_request_receipt_acknowledgments$$,'55000','Financial history is append-only','acknowledgment evidence is immutable');
select throws_ok($$truncate demo_private.entry_request_attempts$$,'55000','Financial history is append-only','replay identities cannot be erased');
set local role anon;
select throws_ok($$select public.submit_preview_entries('recovery-audit',1,'recovery_anon_key',false,null)$$,'42501',null,'anonymous submissions rejected');
reset role;
select * from finish();
rollback;
