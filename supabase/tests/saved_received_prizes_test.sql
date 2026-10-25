-- Rollback-only fixtures; no messages are sent or customer data retained.
begin;
create extension if not exists pgtap;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('75200111-1111-4111-8111-111111111111','saved-sender@example.test',now(),'{"legal_first_name":"Saved","legal_last_name":"Sender","date_of_birth":"1990-01-01"}'),
('75200222-2222-4222-8222-222222222222','saved-recipient@example.test',now(),'{"legal_first_name":"Saved","legal_last_name":"Recipient","date_of_birth":"1990-01-01"}'),
('75200333-3333-4333-8333-333333333333','saved-other@example.test',now(),'{"legal_first_name":"Saved","legal_last_name":"Other","date_of_birth":"1990-01-01"}');
insert into public.product_share_links(token,owner_id,offering_slug,scope_key) values
('75200444-4444-4444-8444-444444444444','75200111-1111-4111-8111-111111111111','playstation-5-slim','crew');
insert into public.crew_receiving_preferences(owner_id,recipient_id,scope_key,receiving,share_back) values
('75200111-1111-4111-8111-111111111111','75200222-2222-4222-8222-222222222222','crew',false,false);
select set_config('test.saved_favorites',(select count(*)::text from public.customer_favorites),true);
select set_config('test.saved_memberships',(select count(*)::text from public.crew_invitations),true);
select set_config('test.saved_emails',(select count(*)::text from public.crew_prize_share_emails),true);
select ok((select relrowsecurity from pg_class where oid='public.received_product_shares'::regclass),'receiving history enforces RLS');
select ok(not has_function_privilege('anon','public.record_saved_product_share(text,uuid,boolean)','execute'),'guests cannot save receipts');
select ok(not has_table_privilege('authenticated','public.received_product_shares','update'),'customers cannot write arbitrary receipt fields');
set local role authenticated;
set local request.jwt.claim.sub='75200222-2222-4222-8222-222222222222';
select set_config('test.saved_receipt',public.record_saved_product_share('playstation-5-slim','75200444-4444-4444-8444-444444444444',true)::text,true);
select is(public.record_saved_product_share('playstation-5-slim','75200444-4444-4444-8444-444444444444',true)::text,current_setting('test.saved_receipt'),'repeated save is idempotent');
select is(jsonb_array_length(public.get_saved_product_shares()),1,'opted-out recipient retains the shared item');
select ok((public.get_saved_product_shares()->0->>'savedAt') is not null,'save is persisted');
select ok((public.set_saved_product_share_state(current_setting('test.saved_receipt')::uuid,'declined')->>'declinedAt') is not null,'decline is persisted');
select lives_ok($$select public.record_saved_product_share('playstation-5-slim','75200444-4444-4444-8444-444444444444',true)$$,'a declined item can be saved again');
select lives_ok($$select public.set_saved_product_share_state(current_setting('test.saved_receipt')::uuid,'viewed')$$,'a declined item can be viewed');
select ok((public.get_saved_product_shares()->0->>'declinedAt') is not null,'viewing and saving do not undo a decline');
select is(public.record_saved_product_share('playstation-5-slim',null,true)::text,current_setting('test.saved_receipt'),'an older link reuses the existing product receipt');
select throws_ok($$select public.record_saved_product_share('nike-court-shot-shoes','75200444-4444-4444-8444-444444444444',true)$$,'42501',null,'a token cannot save a different prize');
select set_config('test.saved_legacy',public.record_saved_product_share('nike-court-shot-shoes',null,true)::text,true);
select is(public.record_saved_product_share('nike-court-shot-shoes',null,true)::text,current_setting('test.saved_legacy'),'older public email links save only once');
select is(jsonb_array_length(public.get_saved_product_shares()),2,'both received products remain in history');
select throws_ok($$select public.set_saved_product_share_state(current_setting('test.saved_receipt')::uuid,'delete')$$,'22023',null,'invalid transitions are rejected');
set local request.jwt.claim.sub='75200333-3333-4333-8333-333333333333';
select is(jsonb_array_length(public.get_saved_product_shares()),0,'other accounts cannot read this history');
select is((select count(*)::int from public.received_product_shares),0,'table RLS isolates the recipient');
select throws_ok($$select public.set_saved_product_share_state(current_setting('test.saved_receipt')::uuid,'restore')$$,'42501',null,'other accounts cannot change the receipt');
set local request.jwt.claim.sub='75200222-2222-4222-8222-222222222222';
select ok((public.set_saved_product_share_state(current_setting('test.saved_receipt')::uuid,'restore')->>'declinedAt') is null,'only explicit undo clears a decline');
reset role;
select is((select count(*)::text from public.customer_favorites),current_setting('test.saved_favorites'),'received saves never change personal favorites');
select is((select count(*)::text from public.crew_invitations),current_setting('test.saved_memberships'),'saved history never creates Crew memberships');
select is((select count(*)::text from public.crew_prize_share_emails),current_setting('test.saved_emails'),'saved history never sends emails');
select ok(not (select receiving from public.crew_receiving_preferences where owner_id='75200111-1111-4111-8111-111111111111' and recipient_id='75200222-2222-4222-8222-222222222222'),'saving never reverses a receiving opt-out');
select * from finish();
rollback;
