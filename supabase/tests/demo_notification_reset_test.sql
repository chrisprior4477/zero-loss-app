-- Exercise the real full reset as an isolated disposable account, then roll back
-- all fixtures, entries, ledger records, and reset records.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values ('a3333333-2222-4333-8444-555555555551','notification-reset@example.test',now(),
'{"legal_first_name":"Notification","legal_last_name":"Test","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id='a3333333-2222-4333-8444-555555555551';
select demo_private.ensure_preview_customer_for('a3333333-2222-4333-8444-555555555551');
insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
select 'len_'||replace(gen_random_uuid()::text,'-',''),w.customer_id,'DEPOSIT','PLAYABLE',1000,'USD','notification_reset_test',w.id,'demo'
from public.wallet_accounts w where w.customer_id='a3333333-2222-4333-8444-555555555551' and w.closed_at is null;
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries,forced_outcome,repeatable_scenario)
values('notification-reset-test','Notification reset','Test','Test','/test.png',2500,100,100,0,'active',false);
set local role authenticated;
select set_config('request.jwt.claim.sub','a3333333-2222-4333-8444-555555555551',true);
select set_config('request.jwt.claims','{"sub":"a3333333-2222-4333-8444-555555555551","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}',true);
do $$
declare result jsonb; archived jsonb; request jsonb;
begin
 if public.get_demo_wallet_history_visibility()->>'notificationResetAt' is not null then raise exception 'New account has reset cutoff';end if;
 request:=public.create_preview_entries('notification-reset-test',1,'notification_entry_test_01');
 perform public.confirm_preview_entry_request((request->>'requestId')::uuid);
 result:=public.reset_all_demo_activity(1,900,'notification_reset_test_01');
 if result->>'clearedCount'<>'1' then raise exception 'Entry not reset';end if;
 archived:=public.get_demo_wallet_history_visibility();
 if archived->>'notificationResetAt' is null then raise exception 'Missing durable notification reset cutoff';end if;
 if public.get_wallet_snapshot()->>'balanceCents'<>'0' then raise exception 'Balance not zero';end if;
 if jsonb_array_length(public.get_account_activity())<>0 then raise exception 'Activity not empty';end if;
 if jsonb_array_length(public.get_account_orders())<>0 then raise exception 'Orders not empty';end if;
 if exists(select 1 from public.ledger_entries l where not (archived->'ledgerEntryIds' @> to_jsonb(array[l.id::text]))) then raise exception 'Wallet notice not archived';end if;
 result:=public.reset_all_demo_activity(1,900,'notification_reset_test_01');
 if result->>'alreadyApplied'<>'true' then raise exception 'Retry not idempotent';end if;
 if public.get_demo_wallet_history_visibility()->>'notificationResetAt'<>archived->>'notificationResetAt' then raise exception 'Retry changed cutoff';end if;
end; $$;
reset role;
do $$
declare a uuid; expected text;
begin
 select customer_id into strict a from public.customer_profiles where display_name='chris prior';
 select max(r.created_at)::text into expected from demo_private.all_activity_reset_requests r where r.customer_id=a;
 perform set_config('request.jwt.claim.sub',a::text,true);
 if (public.get_demo_wallet_history_visibility()->>'notificationResetAt')::timestamptz is distinct from expected::timestamptz then raise exception 'Another account sees test reset';end if;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.get_demo_wallet_history_visibility();raise exception 'Guest was allowed';exception when insufficient_privilege then null;end;
 if has_function_privilege('anon','public.get_demo_wallet_history_visibility()','execute') then raise exception 'Anonymous execute grant';end if;
end;$$;
select 'Full reset clears entries, balance, orders and wallet notices; cutoff is durable, scoped, replay-safe; guest rejected. All test data rolled back.' as result;
rollback;
