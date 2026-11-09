-- No fixture, share, availability or account changes survive this test.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values ('e5091111-2222-4333-8444-555555555551','available-self-share@example.test',now(),
  '{"legal_first_name":"Share","legal_last_name":"Test","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified'
where id='e5091111-2222-4333-8444-555555555551';
select demo_private.ensure_preview_customer_for('e5091111-2222-4333-8444-555555555551');
update demo_private.preview_entry_offerings set active=false where slug='walmart-100-gift-card';
select set_config('request.jwt.claim.sub','e5091111-2222-4333-8444-555555555551',true);
select set_config('request.jwt.claims','{"sub":"e5091111-2222-4333-8444-555555555551","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1","role":"authenticated"}',true);
set local role authenticated;
select set_config('test.self_share.receipt',public.send_demo_product_share('e5091111-2222-4333-8444-555555555552')::text,true);
reset role;
do $$
declare v_share uuid:=current_setting('test.self_share.receipt')::uuid; v_slug text; v_count int;
begin
  select l.offering_slug into strict v_slug from public.received_product_shares s
  join public.product_share_links l on l.token=s.token
  where s.id=v_share and s.recipient_id=auth.uid() and l.owner_id=auth.uid() and l.demo_self;
  if v_slug='walmart-100-gift-card' then raise exception 'Selected closed Walmart pool'; end if;
  if not exists(select 1 from jsonb_array_elements(public.get_preview_offering_availability()) a
    where a->>'slug'=v_slug and (a->>'remaining')::bigint>0) then raise exception 'Selected unavailable pool'; end if;
  select count(*) into v_count from public.received_product_shares where recipient_id=auth.uid();
  if public.send_demo_product_share('e5091111-2222-4333-8444-555555555552')<>v_share then raise exception 'Retry changed receipt'; end if;
  if (select count(*) from public.received_product_shares where recipient_id=auth.uid())<>v_count then raise exception 'Retry created a duplicate'; end if;
  update demo_private.preview_entry_offerings set active=false where slug=v_slug;
  if public.send_demo_product_share('e5091111-2222-4333-8444-555555555552')<>v_share then raise exception 'Closed-pool retry created a different share'; end if;
  if public.send_demo_product_share('e5091111-2222-4333-8444-555555555553')=v_share then raise exception 'New request reused unavailable prize'; end if;
  if exists(select 1 from public.customer_entries where customer_id=auth.uid()) then raise exception 'Sharing created entries'; end if;
  if exists(select 1 from public.ledger_entries where customer_id=auth.uid()) then raise exception 'Sharing moved money'; end if;
  if exists(select 1 from public.received_product_shares s join public.product_share_links l on l.token=s.token
    where l.owner_id=auth.uid() and s.recipient_id<>auth.uid()) then raise exception 'Share sent to someone else'; end if;
  if not exists(select 1 from jsonb_array_elements(public.get_received_product_shares()) r where r->>'id'=v_share::text) then raise exception 'Saved receipt unreadable'; end if;
end;
$$;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$
begin
  begin
    perform demo_private.send_demo_product_share('e5091111-2222-4333-8444-555555555554');
    raise exception 'Anonymous demo sharing was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select 'available self-share, replay, closed pool, self-only and money invariants passed' as result;
rollback;
