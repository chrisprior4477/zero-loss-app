-- Run after the migration. Every fixture and financial fact rolls back.
begin;
create function pg_temp.fail_bulk_decline() returns trigger language plpgsql as $trigger$
begin
  if new.event_type='declined' and current_setting('bulk_test.fail',true)='on' then raise exception 'Injected decline failure'; end if;
  return new;
end; $trigger$;
create trigger bulk_test_failure before insert on public.completion_option_events for each row execute function pg_temp.fail_bulk_decline();
do $$
declare
  owner_id uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); wallet uuid; ids uuid[]; many_ids uuid[];
  request_id uuid:=gen_random_uuid(); answer jsonb; baseline integer; result jsonb;
begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    values(owner_id,'bulk-'||owner_id||'@example.test',now(),'{"legal_first_name":"Bulk","legal_last_name":"Test","date_of_birth":"1990-01-01"}'),
      (other_id,'bulk-'||other_id||'@example.test',now(),'{"legal_first_name":"Other","legal_last_name":"Test","date_of_birth":"1990-01-01"}');
  update public.customers set status='active',verification_status='email_verified' where id in(owner_id,other_id);
  perform demo_private.ensure_preview_customer_for(owner_id);
  perform demo_private.ensure_preview_customer_for(other_id);
  select id into wallet from public.wallet_accounts where customer_id=owner_id and closed_at is null;
  insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
    values('len_'||replace(gen_random_uuid()::text,'-',''),owner_id,'DEPOSIT','PLAYABLE',20000000,'USD','bulk_rollback_fixture',wallet,'demo');
  insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,forced_outcome)
    values('bulk-checkout-rollback','Bulk checkout test','Test Retailer','Test','/test.png',15000,100,1000,'not_selected');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'iss',(select preview_issuer from demo_private.funding_config where singleton))::text,true);
  result:=public.submit_preview_entries('bulk-checkout-rollback',109,'bulk_entry_'||replace(owner_id::text,'-',''),false,null);
  perform public.confirm_preview_entry_request((result->>'requestId')::uuid);
  select array_agg(id order by id) into many_ids from public.completion_options where customer_id=owner_id;
  ids:=many_ids[1:8]; many_ids:=many_ids[9:109];
  if cardinality(ids) is distinct from 8 or cardinality(many_ids) is distinct from 101 then raise exception 'Fixture count failed'; end if;

  -- Reject a changed total, overlaps and ownership before any write.
  begin
    perform public.complete_preview_purchase_options('bulk-checkout-rollback',ids[1:2],ids[3:8],1,gen_random_uuid());
    raise exception 'Incorrect total accepted';
  exception when sqlstate 'P0001' then if sqlerrm<>'Purchase total changed. Refresh your options.' then raise; end if; end;
  begin
    perform public.complete_preview_purchase_options('bulk-checkout-rollback',ids[1:2],ids[2:8],29800,gen_random_uuid());
    raise exception 'Overlap accepted';
  exception when invalid_parameter_value then null; end;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  begin
    perform public.complete_preview_purchase_options('bulk-checkout-rollback',ids[1:2],ids[3:8],29800,gen_random_uuid());
    raise exception 'Foreign options accepted';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);

  -- Exhaust funds only inside a savepoint. Rejection rolls its fixture back too.
  begin
    insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
      select 'len_'||replace(gen_random_uuid()::text,'-',''),owner_id,'CORRECTION','PLAYABLE',-sum(amount),'USD','bulk_insufficient_fixture',wallet,'demo'
      from public.ledger_entries where wallet_account_id=wallet and balance_type='PLAYABLE';
    perform public.complete_preview_purchase_options('bulk-checkout-rollback',ids[1:2],ids[3:8],29800,gen_random_uuid());
    raise exception 'Insufficient funds accepted';
  exception when sqlstate 'P0001' then if sqlerrm<>'Add demo funds before completing these options.' then raise; end if; end;
  if exists(select 1 from public.customer_orders where customer_id=owner_id) or exists(select 1 from public.completion_option_events where customer_id=owner_id and event_type='declined') then raise exception 'Rejected batch left writes'; end if;

  perform set_config('bulk_test.fail','on',true);
  begin
    perform public.complete_preview_purchase_options('bulk-checkout-rollback',ids[1:2],ids[3:8],29800,request_id);
    raise exception 'Failure injection did not run';
  exception when sqlstate 'P0001' then if sqlerrm<>'Injected decline failure' then raise; end if; end;
  perform set_config('bulk_test.fail','off',true);
  if exists(select 1 from public.customer_orders where customer_id=owner_id)
    or exists(select 1 from public.ledger_entries where customer_id=owner_id and entry_type='PURCHASE_DEBIT') then raise exception 'Failed decline retained purchases'; end if;
  execute 'set local role authenticated';
  answer:=public.complete_preview_purchase_options('bulk-checkout-rollback',ids[1:2],ids[3:8],29800,request_id);
  execute 'reset role';
  if answer->>'purchasedCount'<>'2' or answer->>'declinedCount'<>'6' then raise exception 'Wrong batch receipt'; end if;
  if (select count(*) from public.customer_orders where customer_id=owner_id)<>2
    or (select count(*) from public.ledger_entries where customer_id=owner_id and entry_type='PURCHASE_DEBIT')<>2
    or (select sum(amount) from public.ledger_entries where customer_id=owner_id and entry_type='PURCHASE_DEBIT')<>-29800
    or (select count(*) from public.completion_option_events where customer_id=owner_id and event_type='declined')<>6 then raise exception 'Ledger/orders/declines did not reconcile'; end if;
  result:=public.complete_preview_purchase_options('bulk-checkout-rollback',ids[1:2],ids[3:8],29800,request_id);
  if result->>'duplicate'<>'true' then raise exception 'Retry not identified'; end if;
  perform public.revive_preview_purchase_option(ids[3],'revive_bulk_rollback_test');
  perform public.complete_preview_purchase_options('bulk-checkout-rollback',ids[1:2],ids[3:8],29800,request_id);
  if demo_private.option_status(ids[3])<>'available' then raise exception 'Replay declined a revived option'; end if;
  if (select count(*) from public.customer_orders where customer_id=owner_id)<>2 then raise exception 'Duplicate purchase written'; end if;
  begin
    perform public.complete_preview_purchase_options('bulk-checkout-rollback',many_ids[1:1],'{}',14900,request_id);
    raise exception 'Changed request key accepted';
  exception when invalid_parameter_value then null; end;

  -- Stale declined options are rejected before any selected purchase is written.
  perform public.decline_purchase_option(many_ids[101],'decline_bulk_rollback_test');
  begin
    perform public.complete_preview_purchase_options('bulk-checkout-rollback',many_ids[1:2],many_ids[101:101],29800,gen_random_uuid());
    raise exception 'Stale selection accepted';
  exception when sqlstate 'P0001' then if sqlerrm<>'Purchase selection changed. Refresh your options.' then raise; end if; end;
  if (select count(*) from public.customer_orders where customer_id=owner_id)<>2 then raise exception 'Stale request partially purchased'; end if;
  perform public.revive_preview_purchase_option(many_ids[101],'revive_many_rollback_test');
  result:=public.complete_preview_purchase_options('bulk-checkout-rollback',many_ids,'{}',1504900,gen_random_uuid());
  if result->>'purchasedCount'<>'101' or result->>'declinedCount'<>'0' then raise exception 'More-than-100 purchase failed'; end if;
  if (select count(*) from public.customer_orders where customer_id=owner_id)<>103 then raise exception 'Large purchase did not reconcile'; end if;
  if has_function_privilege('anon','public.complete_preview_purchase_options(text,uuid[],uuid[],bigint,uuid)','execute')
    or has_table_privilege('authenticated','purchase_private.bulk_checkout_receipts','select') then raise exception 'Private checkout access leaked'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.complete_preview_purchase_options('bulk-checkout-rollback',ids[1:2],'{}',29800,gen_random_uuid());
    raise exception 'Signed-out purchase accepted';
  exception when insufficient_privilege then null; end;
end;
$$;
select 'PASS: buy 2/decline 6; exact ledger/order totals; retry; revival replay; changed key/price; ownership; no funds; stale selection; 101 purchases; private grants' as result;
rollback;
