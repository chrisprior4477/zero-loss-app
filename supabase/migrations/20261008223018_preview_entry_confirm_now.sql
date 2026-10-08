-- The optional Confirm entry action ends only that customer's pending Undo
-- window. The same eligibility, hold release, debit, entry, and audit writer
-- still performs acceptance atomically. Existing requests keep their history.
begin;

alter table public.entry_requests add column customer_confirmed_at timestamptz;
alter table public.entry_requests add constraint entry_request_customer_confirmation_time
  check (customer_confirmed_at is null or
    (customer_confirmed_at >= requested_at and customer_confirmed_at <= undo_until));
alter table public.entry_requests drop constraint entry_requests_check1;
alter table public.entry_requests add constraint entry_requests_state_or_customer_confirmation check (
  (status='validating' and resolved_at is null and reason_code is null and preview_batch_id is null)
  or (status='accepted' and resolved_at >= coalesce(customer_confirmed_at,undo_until)
    and reason_code='accepted' and preview_batch_id is not null)
  or (status in ('cancelled','rejected') and resolved_at >= requested_at
    and reason_code is not null and preview_batch_id is null)
);

create or replace function demo_private.guard_entry_request() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.status <> 'validating' then
    raise exception 'Entry request history is immutable' using errcode='55000';
  end if;
  if new.status='validating' then
    if old.customer_confirmed_at is not null or new.customer_confirmed_at is null
      or (to_jsonb(new)-'customer_confirmed_at') is distinct from (to_jsonb(old)-'customer_confirmed_at') then
      raise exception 'Entry request history is immutable' using errcode='55000';
    end if;
  elsif new.customer_confirmed_at is distinct from old.customer_confirmed_at
    or (to_jsonb(new)-array['status','resolved_at','reason_code','preview_batch_id'])
      is distinct from (to_jsonb(old)-array['status','resolved_at','reason_code','preview_batch_id']) then
    raise exception 'Entry request history is immutable' using errcode='55000';
  end if;
  return new;
end $$;

create or replace function demo_private.require_entry_request_window() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if (select entry_undo_required from demo_private.funding_config where singleton) then
    if not exists(select 1 from public.entry_requests r join public.preview_entry_batches b on b.id=new.preview_batch_id
      where r.id=new.entry_request_id and r.customer_id=new.customer_id and r.wallet_account_id=new.wallet_account_id
        and r.offering_slug=new.offering_slug and r.unit_price_cents=new.amount and r.status='validating'
        and (r.undo_until<=clock_timestamp() or r.customer_confirmed_at is not null)
        and b.idempotency_key=r.idempotency_key and b.quantity=r.requested_quantity) then
      raise exception 'A completed Undo window or customer confirmation is required before accepting entries' using errcode='42501';
    end if;
  end if;
  return new;
end $$;

create or replace function demo_private.resolve_entry_request(p_request uuid,p_cancel boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.entry_requests; o demo_private.preview_entry_offerings; t demo_private.entry_request_terms;
  b public.preview_entry_batches; e public.customer_entries; v_index integer; v_valid boolean;
begin
  select * into r from public.entry_requests where id=p_request;
  if not found then raise exception 'Entry request unavailable' using errcode='22023'; end if;
  perform 1 from public.customers where id=r.customer_id for update;
  perform 1 from public.demo_payment_accounts where customer_id=r.customer_id for update;
  perform 1 from public.wallet_accounts where id=r.wallet_account_id for update;
  select * into strict o from demo_private.preview_entry_offerings where slug=r.offering_slug for update;
  select * into strict r from public.entry_requests where id=p_request for update;
  if r.status<>'validating' then return demo_private.entry_request_response(r.id,true); end if;
  if p_cancel and r.customer_confirmed_at is null and clock_timestamp()<r.undo_until then
    perform demo_private.post_entry_request_hold(r.id,true);
    update public.entry_requests set status='cancelled',reason_code='customer_undo',resolved_at=clock_timestamp() where id=r.id;
    insert into public.entry_request_events(request_id,event_name,actor,reason_code) values(r.id,'entry.cancelled','customer','customer_undo');
    return demo_private.entry_request_response(r.id,false);
  end if;
  if clock_timestamp()<r.undo_until and r.customer_confirmed_at is null then return demo_private.entry_request_response(r.id,false); end if;
  -- The original acceptance validation and ledger writer remain authoritative.
  select o.active and exists(select 1 from public.customers c join auth.users u on u.id=c.id
      where c.id=r.customer_id and c.status='active' and c.verification_status='email_verified' and u.email_confirmed_at is not null)
    and exists(select 1 from public.wallet_accounts where id=r.wallet_account_id and closed_at is null)
    and exists(select 1 from public.demo_payment_accounts where customer_id=r.customer_id and enabled and funding_enabled)
    and exists(select 1 from demo_private.funding_config where singleton and enabled and preview_entries_enabled
      and environment='development-test' and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1') into v_valid;
  perform demo_private.post_entry_request_hold(r.id,true);
  if not v_valid then
    update public.entry_requests set status='rejected',reason_code='eligibility_changed',resolved_at=clock_timestamp() where id=r.id;
    insert into public.entry_request_events(request_id,event_name,actor,reason_code) values(r.id,'entry.rejected','system','eligibility_changed');
    return demo_private.entry_request_response(r.id,false);
  end if;
  select * into strict t from demo_private.entry_request_terms where request_id=r.id;
  insert into public.preview_entry_batches(batch_id,customer_id,wallet_account_id,offering_slug,quantity,idempotency_key)
    values('bat_'||replace(gen_random_uuid()::text,'-',''),r.customer_id,r.wallet_account_id,r.offering_slug,r.requested_quantity,r.idempotency_key)
    returning * into b;
  for v_index in 1..r.requested_quantity loop
    insert into public.customer_entries(entry_id,customer_id,wallet_account_id,offering_slug,amount,idempotency_key,outcome_status,preview_batch_id,entry_request_id)
      values('ent_'||replace(gen_random_uuid()::text,'-',''),r.customer_id,r.wallet_account_id,r.offering_slug,r.unit_price_cents,
        'batch_'||md5(r.customer_id::text||':'||r.idempotency_key||':'||v_index::text),t.forced_outcome,b.id,r.id) returning * into e;
    insert into public.ledger_entries(ledger_entry_id,customer_id,entry_type,balance_type,amount,currency,source_event,
      related_pool_id,related_entry_id,wallet_account_id,wallet_scope,customer_entry_id)
      values('len_'||replace(gen_random_uuid()::text,'-',''),r.customer_id,'ENTRY_DEBIT','PLAYABLE',-r.unit_price_cents,'USD',
        'preview_entry_'||e.id::text,'preview_'||r.offering_slug,e.entry_id,r.wallet_account_id,'demo',e.id);
    if t.forced_outcome in ('winner','not_selected') then
      insert into public.entry_outcomes(customer_entry_id,customer_id,wallet_account_id,outcome) values(e.id,r.customer_id,r.wallet_account_id,t.forced_outcome);
    end if;
    if t.forced_outcome='winner' then
      insert into public.customer_rewards(customer_entry_id,customer_id,wallet_account_id) values(e.id,r.customer_id,r.wallet_account_id);
    elsif t.forced_outcome='not_selected' then
      insert into public.completion_options(customer_entry_id,customer_id,wallet_account_id,paid_cents,remaining_cents)
        values(e.id,r.customer_id,r.wallet_account_id,r.unit_price_cents,greatest(t.value_cents-r.unit_price_cents,0));
    end if;
    if r.share_with_crew then insert into public.crew_entry_shares(entry_id,owner_id) values(e.id,r.customer_id); end if;
  end loop;
  update public.entry_requests set status='accepted',reason_code='accepted',resolved_at=clock_timestamp(),preview_batch_id=b.id where id=r.id;
  insert into public.entry_request_events(request_id,event_name,actor,reason_code)
    values(r.id,'entry.accepted','system',case when r.customer_confirmed_at is null then 'undo_window_elapsed' else 'customer_confirmed' end);
  return demo_private.entry_request_response(r.id,false);
end $$;

create function public.confirm_preview_entry_request(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.entry_requests;
begin
  if p_request_id is null or auth.uid() is null or not coalesce((select preview_entries_enabled
      and environment='development-test' and preview_issuer=auth.jwt()->>'iss'
      from demo_private.funding_config where singleton),false) then
    raise exception 'Preview entry confirmation unavailable' using errcode='42501';
  end if;
  select * into r from public.entry_requests where id=p_request_id;
  if not found or r.customer_id is distinct from auth.uid() then
    raise exception 'Entry request unavailable' using errcode='42501';
  end if;
  -- Match the canonical writer's lock order. An Undo or scheduled finalizer
  -- racing this confirmation sees the single saved result after these locks.
  perform 1 from public.customers where id=r.customer_id for update;
  perform 1 from public.demo_payment_accounts where customer_id=r.customer_id for update;
  perform 1 from public.wallet_accounts where id=r.wallet_account_id for update;
  perform 1 from demo_private.preview_entry_offerings where slug=r.offering_slug for update;
  select * into strict r from public.entry_requests where id=p_request_id for update;
  if r.status='validating' and r.customer_confirmed_at is null and clock_timestamp()<r.undo_until then
    update public.entry_requests set customer_confirmed_at=clock_timestamp() where id=r.id;
  end if;
  return demo_private.resolve_entry_request(p_request_id,false);
end $$;
revoke all on function public.confirm_preview_entry_request(uuid) from public,anon,authenticated,service_role;
grant execute on function public.confirm_preview_entry_request(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
