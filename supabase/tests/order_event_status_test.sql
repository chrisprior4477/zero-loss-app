-- All customers, entries and transactions created here are rolled back.
begin;
update demo_private.funding_config set enabled=true, preview_provisioning_enabled=true,
  preview_entries_enabled=true, entry_undo_required=true, environment='development-test',
  preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1' where singleton;
do $$
declare
  owner_id uuid := gen_random_uuid(); other_id uuid := gen_random_uuid();
  wallet uuid; options uuid[]; receipt jsonb; order_id uuid; order_number text;
  rows jsonb; tie_time timestamptz := clock_timestamp() + interval '1 minute';
begin
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    values (owner_id,'order-status-'||owner_id||'@example.test',now(),'{"legal_first_name":"Order","legal_last_name":"Test","date_of_birth":"1990-01-01"}'),
      (other_id,'order-status-'||other_id||'@example.test',now(),'{"legal_first_name":"Other","legal_last_name":"Test","date_of_birth":"1990-01-01"}');
  update public.customers set status='active',verification_status='email_verified' where id in (owner_id,other_id);
  perform demo_private.ensure_preview_customer_for(owner_id);
  perform demo_private.ensure_preview_customer_for(other_id);
  select id into wallet from public.wallet_accounts where customer_id=owner_id and closed_at is null;
  insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,wallet_account_id,wallet_scope)
    values('len_'||replace(gen_random_uuid()::text,'-',''),owner_id,'DEPOSIT','PLAYABLE',10000,'USD','order_status_test',wallet,'demo');
  insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,forced_outcome)
    values('order-status-test','Order status test','Test Retailer','Test','/test.png',2500,100,100,'not_selected');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'iss',(select preview_issuer from demo_private.funding_config where singleton))::text,true);
  receipt := public.submit_preview_entries('order-status-test',2,'order_status_'||replace(owner_id::text,'-',''),false,null);
  perform public.confirm_preview_entry_request((receipt->>'requestId')::uuid);
  select array_agg(id order by id) into options from public.completion_options where customer_id=owner_id;
  if cardinality(options) <> 2 then raise exception 'Expected two separate options'; end if;
  perform public.purchase_preview_gift_card(options[1],'order_status_purchase_one');
  perform public.purchase_preview_gift_card(options[2],'order_status_purchase_two');
  rows := public.get_account_orders();
  if jsonb_array_length(rows) <> 2 or exists(select 1 from jsonb_array_elements(rows) r where r->>'status' <> 'fulfilled') then
    raise exception 'Completed checkouts should both read as fulfilled: %', rows;
  end if;
  if (select count(*) from public.ledger_entries where customer_id=owner_id and entry_type='PURCHASE_DEBIT') <> 2
    or (select sum(amount) from public.ledger_entries where customer_id=owner_id and entry_type='PURCHASE_DEBIT') <> -4800 then
    raise exception 'Purchase ledger does not reconcile';
  end if;
  select o.id,o.order_number into order_id,order_number from public.customer_orders o where o.customer_id=owner_id order by o.order_number limit 1;
  -- Deliberately make the payment UUID sort after fulfillment at the same time.
  insert into public.order_events(id,order_id,customer_id,event_type,created_at) values
    ('ffffffff-ffff-ffff-ffff-fffffffffff1',order_id,owner_id,'payment_confirmed',tie_time),
    ('00000000-0000-0000-0000-000000000001',order_id,owner_id,'fulfilled',tie_time);
  rows := public.get_account_orders();
  if (select r->>'status' from jsonb_array_elements(rows) r where r->>'order_number'=order_number) <> 'fulfilled' then
    raise exception 'Equal-time fulfilled event was hidden by UUID order';
  end if;
  insert into public.order_events(order_id,customer_id,event_type,created_at) values(order_id,owner_id,'exception',tie_time);
  rows := public.get_account_orders();
  if (select r->>'status' from jsonb_array_elements(rows) r where r->>'order_number'=order_number) <> 'exception' then
    raise exception 'Equal-time exception must remain visible';
  end if;
  insert into public.order_events(order_id,customer_id,event_type,created_at) values(order_id,owner_id,'issuance_pending',tie_time + interval '1 minute');
  rows := public.get_account_orders();
  if (select r->>'status' from jsonb_array_elements(rows) r where r->>'order_number'=order_number) <> 'issuance_pending' then
    raise exception 'A later event must take precedence over an older event';
  end if;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  if jsonb_array_length(public.get_account_orders()) <> 0 then raise exception 'Another customer could see these orders'; end if;
  if has_function_privilege('anon','public.get_account_orders()','execute') then raise exception 'Anonymous order access granted'; end if;
end;
$$;
select 'PASS: two checkouts, exact debits, equal-time ordering, exception and later-event precedence, ownership' as result;
rollback;
