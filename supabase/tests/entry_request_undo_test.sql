begin;
create extension if not exists pgtap;
select no_plan();
update demo_private.funding_config set enabled=true,preview_provisioning_enabled=true,preview_entries_enabled=true,
  entry_undo_required=true,preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('41414141-4141-4141-8141-414141414141','undo-one@example.test',now(),'{"legal_first_name":"Undo","legal_last_name":"One","date_of_birth":"1990-01-01"}'),
 ('42424242-4242-4242-8242-424242424242','undo-two@example.test',now(),'{"legal_first_name":"Undo","legal_last_name":"Two","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id in ('41414141-4141-4141-8141-414141414141','42424242-4242-4242-8242-424242424242');
select demo_private.ensure_preview_customer_for('41414141-4141-4141-8141-414141414141');
select demo_private.ensure_preview_customer_for('42424242-4242-4242-8242-424242424242');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
 select 'len_'||replace(gen_random_uuid()::text,'-',''),customer_id,'DEPOSIT','PLAYABLE',10000,'USD','undo_test_funding',id,'demo'
 from public.wallet_accounts where customer_id in ('41414141-4141-4141-8141-414141414141','42424242-4242-4242-8242-424242424242') and scope='demo' and closed_at is null;
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries)
 values('undo-audit','Undo test','Test','Test','/test.png',2500,100,10,7),
 ('undo-expensive','Expensive test','Test','Test','/test.png',20000,20000,10,0);
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries,forced_outcome,repeatable_scenario)
 values('samsung-m70h-tv','TV','Test','Test','/test.png',40000,100,1200,1199,'winner',true),
 ('nike-court-shot-shoes','Shoes','Test','Test','/test.png',7500,100,225,224,'not_selected',true),
 ('babys-essentials-bundle','Baby','Test','Test','/test.png',10000,100,300,299,'not_selected',true)
 on conflict(slug) do update set active=true,repeatable_scenario=true,forced_outcome=excluded.forced_outcome;
create temporary table undo_saved(value jsonb);
grant all on undo_saved to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','41414141-4141-4141-8141-414141414141',true);
select set_config('request.jwt.claims','{"sub":"41414141-4141-4141-8141-414141414141","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
insert into undo_saved select public.create_preview_entries_with_sharing('undo-audit',3,'undo_submission_one',true);
select is((select value->>'status' from undo_saved),'pending','submission starts pending');
select is((select ((value->>'undoUntil')::timestamptz-(select requested_at from public.entry_requests where id=(value->>'requestId')::uuid)) from undo_saved),interval '30 seconds','server gives exactly 30 seconds');
select is(public.get_wallet_snapshot()->>'balanceCents','9700','three dollars reserved from ledger balance');
select is((select count(*)::integer from public.customer_entries),0,'pending request creates no authoritative entries');
select is((select count(*)::integer from public.customer_rewards),0,'pending request reveals no rewards');
select is((select count(*)::integer from public.crew_entry_shares),0,'pending request shares no activity');
select is((select value->>'receipt' from undo_saved),null::text,'pending receipt contains no result');
select is((select a->>'remaining' from jsonb_array_elements(public.get_preview_offering_availability()) a where a->>'slug'='undo-audit'),'0','pending slots count toward availability');
select is(public.create_preview_entries_with_sharing('undo-audit',3,'undo_submission_one',true)->>'duplicate','true','same request safely retries');
select is(public.get_wallet_snapshot()->>'balanceCents','9700','retry reserves only once');
select throws_ok($$select public.create_preview_entries_with_sharing('undo-audit',2,'undo_submission_one',true)$$,'22023',null,'same key cannot change quantity');
select throws_ok($$select public.create_preview_entries_with_sharing('undo-audit',3,'undo_submission_one',false)$$,'22023',null,'same key cannot change privacy');
select is(public.create_preview_entries('undo-audit',1,'undo_reload_new_key')->>'requestId',(select value->>'requestId' from undo_saved),'new page key resumes existing pending prize');
select is(public.create_preview_entry('undo-audit','undo_legacy_one_key')->>'status','pending','legacy single-entry RPC cannot bypass waiting');
select is(public.resolve_preview_entry_request((select (value->>'requestId')::uuid from undo_saved),false)->>'status','pending','client cannot finalize before deadline');
select throws_ok($$update public.entry_requests set undo_until=now()$$,'42501',null,'customer cannot alter deadline');
select throws_ok($$select * from demo_private.entry_request_terms$$,'42501',null,'private fixture outcome cannot be read');
select throws_ok($$select demo_private.finalize_due_entry_requests()$$,'42501',null,'customer cannot invoke worker');
select throws_ok($$select demo_private.create_preview_entries_immediate('undo-audit',1,'bypass_immediate_key')$$,'42501',null,'old writer is not a public bypass');
select throws_ok($$select public.create_preview_entries('undo-expensive',1,'undo_insufficient_key')$$,'P0001','Add demo funds before entering this quantity.','insufficient balance fails before reservation');
select set_config('request.jwt.claim.sub','42424242-4242-4242-8242-424242424242',true);
select set_config('request.jwt.claims','{"sub":"42424242-4242-4242-8242-424242424242","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is((select count(*)::integer from public.entry_requests),0,'other customer cannot read pending requests');
select is(public.list_preview_entry_requests(),'[]'::jsonb,'other customer receives no request receipts');
select throws_ok($$select public.resolve_preview_entry_request((select (value->>'requestId')::uuid from undo_saved),true)$$,'42501',null,'cannot cancel another customer request');
select throws_ok($$select public.create_preview_entries('undo-audit',1,'undo_other_full_key')$$,'P0001','There are not enough entries remaining for that quantity.','reserved last slots cannot be oversold');
select set_config('request.jwt.claim.sub','41414141-4141-4141-8141-414141414141',true);
select set_config('request.jwt.claims','{"sub":"41414141-4141-4141-8141-414141414141","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
select is(public.resolve_preview_entry_request((select (value->>'requestId')::uuid from undo_saved),true)->>'status','cancelled','Undo cancels whole submission');
select is(public.get_wallet_snapshot()->>'balanceCents','10000','Undo returns exact amount to same playable wallet');
select is(public.resolve_preview_entry_request((select (value->>'requestId')::uuid from undo_saved),true)->>'status','cancelled','repeated Undo is idempotent');
select is(public.get_wallet_snapshot()->>'balanceCents','10000','repeated Undo cannot mint money');
select is((select count(*)::integer from public.ledger_entries where entry_type='ENTRY_HOLD_RELEASE'),1,'one release ledger row');
select is((select a->>'remaining' from jsonb_array_elements(public.get_preview_offering_availability()) a where a->>'slug'='undo-audit'),'3','Undo releases every slot');
select is(public.create_preview_entries_with_sharing('undo-audit',3,'undo_submission_one',true)->>'status','cancelled','retry after Undo cannot recreate entries');
select is((select count(*)::integer from public.entry_request_events),2,'requested and cancelled audit events preserved');
reset role;
select throws_ok($$update public.entry_requests set requested_quantity=1$$,'55000','Entry request history is immutable','even privileged edits cannot rewrite request terms');
select throws_ok($$delete from public.entry_requests$$,'55000','Financial history is append-only','requests cannot be erased');
select throws_ok($$truncate public.entry_request_events$$,'55000','Financial history is append-only','decision trail cannot be truncated');

-- Historical pending fixture, inserted already due rather than altering any
-- request's immutable deadline or exposing a test clock in production code.
create function pg_temp.due_request(p_slug text,p_key text,p_quantity integer,p_share boolean) returns uuid language plpgsql as $$
declare r public.entry_requests; o demo_private.preview_entry_offerings; w uuid; v_start timestamptz:=clock_timestamp()-interval '31 seconds';
begin
 select * into strict o from demo_private.preview_entry_offerings where slug=p_slug;
 select id into strict w from public.wallet_accounts where customer_id='41414141-4141-4141-8141-414141414141' and scope='demo' and closed_at is null;
 insert into public.entry_requests(customer_id,wallet_account_id,offering_slug,requested_quantity,unit_price_cents,idempotency_key,share_with_crew,requested_at,undo_until)
 values('41414141-4141-4141-8141-414141414141',w,p_slug,p_quantity,o.entry_price_cents,p_key,p_share,v_start,v_start+interval '30 seconds') returning * into r;
 insert into demo_private.entry_request_terms values(r.id,o.value_cents,o.forced_outcome);
 perform demo_private.post_entry_request_hold(r.id,false);
 insert into public.entry_request_events(request_id,event_name,actor,reason_code) values(r.id,'entry.requested','customer','undo_window');
 return r.id;
end $$;
truncate undo_saved;
insert into undo_saved select jsonb_build_object('requestId',pg_temp.due_request('undo-audit','undo_expired_fixture',2,true));
set local role authenticated;
select is(public.resolve_preview_entry_request((select (value->>'requestId')::uuid from undo_saved),true)->>'status','accepted','late Undo cannot cancel an entry after the server deadline');
select is(public.get_wallet_snapshot()->>'balanceCents','9800','finalization does not charge twice');
select is((select count(*)::integer from public.customer_entries),2,'finalization creates exact quantity');
select is((select count(*)::integer from public.crew_entry_shares),2,'sharing appears only after finalization');
select is(public.resolve_preview_entry_request((select (value->>'requestId')::uuid from undo_saved),false)->>'status','accepted','repeat finalization returns same receipt');
select is((select count(*)::integer from public.customer_entries),2,'repeat finalization creates no duplicate entries');
select is((select a->>'remaining' from jsonb_array_elements(public.get_preview_offering_availability()) a where a->>'slug'='undo-audit'),'1','accepted entries replace reservation without double counting');
select is((public.resolve_preview_entry_request((select (value->>'requestId')::uuid from undo_saved),false)->'receipt'->>'entryId') like 'ent_%',true,'receipt leads to exact stored entry');
reset role;
select pg_temp.due_request('samsung-m70h-tv','undo_tv_due_fixture',1,false);
select pg_temp.due_request('nike-court-shot-shoes','undo_shoe_due_fixture',1,false);
select pg_temp.due_request('babys-essentials-bundle','undo_baby_due_fixture',1,false);
select is(demo_private.finalize_due_entry_requests(),3,'worker finalizes without browser or JWT impersonation');
select is((select count(*)::integer from public.customer_rewards where customer_id='41414141-4141-4141-8141-414141414141'),1,'TV winner preserved');
select is((select count(*)::integer from public.completion_options where customer_id='41414141-4141-4141-8141-414141414141'),2,'shoes and baby completion scenarios preserved');
select is(demo_private.finalize_due_entry_requests(),0,'worker retry does not duplicate');
select pg_temp.due_request('undo-audit','undo_restricted_fixture',1,false);
update public.customers set status='suspended' where id='41414141-4141-4141-8141-414141414141';
select is(demo_private.finalize_due_entry_requests(),1,'changed eligibility resolves safely');
select is((select status from public.entry_requests where idempotency_key='undo_restricted_fixture'),'rejected','restricted customer is not entered');
select is((select count(*)::integer from public.customer_entries where customer_id='41414141-4141-4141-8141-414141414141'),5,'rejected request creates no extra entry');
select is((select sum(amount)::integer from public.ledger_entries where customer_id='41414141-4141-4141-8141-414141414141'),9500,'system rejection releases reservation without refunding payment card');
select is((select count(*)::integer from public.entry_requests where status='validating'),0,'no pending request abandoned');
select * from finish();
rollback;
