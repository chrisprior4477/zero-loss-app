-- Owner-approved 30-second pending period. Existing entries/results are untouched.
-- Deployment is two-phase: install with the switch off, deploy compatible UI,
-- then enable the switch and scheduler in a separate checkpoint.
begin;
alter table demo_private.funding_config add column entry_undo_required boolean not null default false;

create table public.entry_requests (
  id uuid primary key default gen_random_uuid(),
  entry_request_id text not null unique default ('erq_'||replace(gen_random_uuid()::text,'-','')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null,
  wallet_scope text not null default 'demo' check(wallet_scope='demo'),
  currency text not null default 'USD' check(currency='USD'),
  offering_slug text not null references demo_private.preview_entry_offerings(slug) on delete restrict,
  requested_quantity integer not null check(requested_quantity between 1 and 10),
  unit_price_cents integer not null check(unit_price_cents>0),
  idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  share_with_crew boolean not null,
  ruleset_version text not null default 'demo-entry-undo-v1' check(ruleset_version='demo-entry-undo-v1'),
  status text not null default 'validating' check(status in ('validating','accepted','cancelled','rejected')),
  requested_at timestamptz not null default clock_timestamp(),
  undo_until timestamptz not null,
  resolved_at timestamptz,
  reason_code text,
  preview_batch_id uuid unique references public.preview_entry_batches(id) on delete restrict,
  unique(customer_id,idempotency_key),
  unique(id,wallet_account_id,customer_id,wallet_scope,currency),
  foreign key(wallet_account_id,customer_id,wallet_scope,currency)
    references public.wallet_accounts(id,customer_id,scope,currency) on delete restrict,
  check(undo_until=requested_at+interval '30 seconds'),
  check((status='validating' and resolved_at is null and reason_code is null and preview_batch_id is null)
    or (status='accepted' and resolved_at>=undo_until and reason_code='accepted' and preview_batch_id is not null)
    or (status in ('cancelled','rejected') and resolved_at>=requested_at and reason_code is not null and preview_batch_id is null))
);
create index entry_requests_due on public.entry_requests(undo_until,id) where status='validating';
create index entry_requests_customer on public.entry_requests(customer_id,requested_at desc);
create index entry_requests_capacity on public.entry_requests(offering_slug) where status='validating';
-- A reload cannot start a second pending submission for the same prize. The
-- existing request is returned instead; a completed submission may be repeated.
create unique index entry_requests_one_pending_prize on public.entry_requests(customer_id,offering_slug) where status='validating';
alter table public.entry_requests enable row level security;
revoke all on public.entry_requests from public,anon,authenticated,service_role;
grant select on public.entry_requests to authenticated;
create policy entry_requests_owner on public.entry_requests for select to authenticated using(customer_id=auth.uid());
alter table public.customer_entries add column entry_request_id uuid references public.entry_requests(id) on delete restrict;
create index customer_entries_request on public.customer_entries(entry_request_id) where entry_request_id is not null;
create function demo_private.require_entry_request_window() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (select entry_undo_required from demo_private.funding_config where singleton) then
    if not exists(select 1 from public.entry_requests r join public.preview_entry_batches b on b.id=new.preview_batch_id
      where r.id=new.entry_request_id and r.customer_id=new.customer_id and r.wallet_account_id=new.wallet_account_id
        and r.offering_slug=new.offering_slug and r.unit_price_cents=new.amount and r.status='validating'
        and r.undo_until<=clock_timestamp() and b.idempotency_key=r.idempotency_key and b.quantity=r.requested_quantity) then
      raise exception 'A completed Undo window is required before accepting entries' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function demo_private.require_entry_request_window() from public,anon,authenticated,service_role;
create trigger entry_requires_undo_window before insert on public.customer_entries for each row execute function demo_private.require_entry_request_window();

-- Snapshot private outcome fixtures separately: a pending request must not leak
-- a result via SELECT before it becomes an Entry. No real draw is introduced.
create table demo_private.entry_request_terms (
  request_id uuid primary key references public.entry_requests(id) on delete restrict,
  value_cents integer not null,
  forced_outcome text not null check(forced_outcome in ('active','winner','not_selected'))
);
create table public.entry_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.entry_requests(id) on delete restrict,
  event_name text not null check(event_name in ('entry.requested','entry.accepted','entry.cancelled','entry.rejected')),
  occurred_at timestamptz not null default clock_timestamp(),
  actor text not null check(actor in ('customer','system')),
  reason_code text not null,
  unique(request_id,event_name)
);
alter table demo_private.entry_request_terms enable row level security;
alter table public.entry_request_events enable row level security;
revoke all on demo_private.entry_request_terms,public.entry_request_events from public,anon,authenticated,service_role;
grant select on public.entry_request_events to authenticated;
create policy entry_request_events_owner on public.entry_request_events for select to authenticated
  using(exists(select 1 from public.entry_requests r where r.id=request_id and r.customer_id=auth.uid()));

create function demo_private.guard_entry_request() returns trigger language plpgsql set search_path='' as $$
begin
  if old.status<>'validating' or new.status='validating'
    or (to_jsonb(new)-array['status','resolved_at','reason_code','preview_batch_id'])
      is distinct from (to_jsonb(old)-array['status','resolved_at','reason_code','preview_batch_id']) then
    raise exception 'Entry request history is immutable' using errcode='55000';
  end if;
  return new;
end $$;
revoke all on function demo_private.guard_entry_request() from public,anon,authenticated,service_role;
create trigger entry_request_state_guard before update on public.entry_requests for each row execute function demo_private.guard_entry_request();
create trigger entry_request_no_delete before delete on public.entry_requests for each row execute function public.reject_financial_history_mutation();
create trigger entry_request_no_truncate before truncate on public.entry_requests for each statement execute function public.reject_financial_history_mutation();
create trigger entry_request_events_immutable before update or delete on public.entry_request_events for each row execute function public.reject_financial_history_mutation();
create trigger entry_request_events_no_truncate before truncate on public.entry_request_events for each statement execute function public.reject_financial_history_mutation();
create trigger entry_request_terms_immutable before update or delete on demo_private.entry_request_terms for each row execute function public.reject_financial_history_mutation();
create trigger entry_request_terms_no_truncate before truncate on demo_private.entry_request_terms for each statement execute function public.reject_financial_history_mutation();

alter table public.ledger_entries drop constraint ledger_entries_entry_type_check;
alter table public.ledger_entries add constraint ledger_entries_entry_type_check check(entry_type in
  ('DEPOSIT','ENTRY_DEBIT','REBATE_CREDIT','REFUND','PAYOUT','CORRECTION','PURCHASE_DEBIT','UNCLAIMED_WINNER_CREDIT','ENTRY_HOLD','ENTRY_HOLD_RELEASE'));
alter table public.ledger_entries add column entry_request_id uuid,
  add constraint ledger_entry_request_identity foreign key(entry_request_id,wallet_account_id,customer_id,wallet_scope,currency)
    references public.entry_requests(id,wallet_account_id,customer_id,wallet_scope,currency) on delete restrict,
  add constraint ledger_entry_request_shape check(
    (entry_request_id is null and entry_type not in ('ENTRY_HOLD','ENTRY_HOLD_RELEASE')) or
    (entry_request_id is not null and wallet_scope='demo' and balance_type='PLAYABLE' and customer_entry_id is null and
      ((entry_type='ENTRY_HOLD' and amount<0) or (entry_type='ENTRY_HOLD_RELEASE' and amount>0)))
  );
create unique index ledger_entry_request_once on public.ledger_entries(entry_request_id,entry_type) where entry_request_id is not null;

-- Ledger-owned interface. Pools passes a request identity, never a debit amount.
-- Amount and wallet always come from immutable, validated request terms.
create function demo_private.post_entry_request_hold(p_request uuid,p_release boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r public.entry_requests; v_type text; v_hold text;
begin
  select * into strict r from public.entry_requests where id=p_request;
  v_type:=case when p_release then 'ENTRY_HOLD_RELEASE' else 'ENTRY_HOLD' end;
  if p_release then
    select ledger_entry_id into strict v_hold from public.ledger_entries where entry_request_id=r.id and entry_type='ENTRY_HOLD';
  end if;
  insert into public.ledger_entries(ledger_entry_id,customer_id,wallet_account_id,wallet_scope,currency,
    entry_type,balance_type,amount,source_event,entry_request_id,corrects_ledger_entry_id)
  values('len_'||replace(gen_random_uuid()::text,'-',''),r.customer_id,r.wallet_account_id,'demo','USD',v_type,'PLAYABLE',
    r.unit_price_cents*r.requested_quantity*case when p_release then 1 else -1 end,
    'entry_request_'||r.id::text||'_'||v_type,r.id,v_hold)
  on conflict(entry_request_id,entry_type) where entry_request_id is not null do nothing;
end $$;
revoke all on function demo_private.post_entry_request_hold(uuid,boolean) from public,anon,authenticated,service_role;

create function demo_private.entry_request_response(p_request uuid,p_duplicate boolean default false) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('requestId',r.id,'entryRequestId',r.entry_request_id,'slug',r.offering_slug,
    'title',o.title,'quantity',r.requested_quantity,'amountCents',r.unit_price_cents*r.requested_quantity,
    'status',case when r.status='validating' then 'pending' else r.status end,
    'undoUntil',r.undo_until,'serverNow',clock_timestamp(),'duplicate',p_duplicate,
    'receipt',case when r.status='accepted' then demo_private.preview_entry_batch_response(r.preview_batch_id,p_duplicate) else null end)
  from public.entry_requests r join demo_private.preview_entry_offerings o on o.slug=r.offering_slug where r.id=p_request;
$$;
revoke all on function demo_private.entry_request_response(uuid,boolean) from public,anon,authenticated,service_role;

-- Locks match funding's customer -> enrollment -> wallet -> offering -> request.
-- All state/time checks occur AFTER waiting for locks, using clock_timestamp().
create function demo_private.resolve_entry_request(p_request uuid,p_cancel boolean default false) returns jsonb
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
  if p_cancel and clock_timestamp()<r.undo_until then
    perform demo_private.post_entry_request_hold(r.id,true);
    update public.entry_requests set status='cancelled',reason_code='customer_undo',resolved_at=clock_timestamp() where id=r.id;
    insert into public.entry_request_events(request_id,event_name,actor,reason_code) values(r.id,'entry.cancelled','customer','customer_undo');
    return demo_private.entry_request_response(r.id,false);
  end if;
  if clock_timestamp()<r.undo_until then return demo_private.entry_request_response(r.id,false); end if;
  -- Recheck eligibility at acceptance; closed/paused accounts or offerings are
  -- rejected and released, never trapped or silently admitted to a drawing.
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
  insert into public.entry_request_events(request_id,event_name,actor,reason_code) values(r.id,'entry.accepted','system','undo_window_elapsed');
  return demo_private.entry_request_response(r.id,false);
end $$;
revoke all on function demo_private.resolve_entry_request(uuid,boolean) from public,anon,authenticated,service_role;

create function demo_private.request_preview_entries(p_offering_slug text,p_quantity integer,p_idempotency_key text,p_share_with_crew boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; r public.entry_requests; b public.preview_entry_batches; o demo_private.preview_entry_offerings;
  v_balance bigint; v_count bigint; v_now timestamptz; v_shared integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity not between 1 and 10 or p_share_with_crew is null
    or p_offering_slug is null or p_offering_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid entry request' using errcode='22023';
  end if;
  if not coalesce((select preview_entries_enabled and environment='development-test' and preview_issuer=auth.jwt()->>'iss'
    from demo_private.funding_config where singleton),false) then raise exception 'Preview entries unavailable' using errcode='42501'; end if;
  v_wallet:=demo_private.lock_funding_wallet();
  select * into r from public.entry_requests where customer_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if r.wallet_account_id<>v_wallet or r.offering_slug<>p_offering_slug or r.requested_quantity<>p_quantity or r.share_with_crew<>p_share_with_crew then
      raise exception 'Idempotency key belongs to a different entry request' using errcode='22023'; end if;
    return demo_private.entry_request_response(r.id,true);
  end if;
  -- Historical receipts retain their original identity and privacy choice.
  select * into b from public.preview_entry_batches where customer_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if b.wallet_account_id<>v_wallet or b.offering_slug<>p_offering_slug or b.quantity<>p_quantity then
      raise exception 'Idempotency key belongs to a different entry request' using errcode='22023'; end if;
    select count(s.entry_id) into v_shared from public.customer_entries e left join public.crew_entry_shares s on s.entry_id=e.id where e.preview_batch_id=b.id;
    if (p_share_with_crew and v_shared<>p_quantity) or (not p_share_with_crew and v_shared<>0) then
      raise exception 'This entry was already saved with a different sharing choice. Review it in Your Crew.' using errcode='P0001'; end if;
    return demo_private.preview_entry_batch_response(b.id,true);
  end if;
  select * into r from public.entry_requests where customer_id=auth.uid() and offering_slug=p_offering_slug and status='validating';
  if found then return demo_private.entry_request_response(r.id,true); end if;
  select * into o from demo_private.preview_entry_offerings where slug=p_offering_slug and active for update;
  if not found then raise exception 'This preview offering is unavailable' using errcode='22023'; end if;
  -- Count all attempted reservations, including undone ones, without counting
  -- their subsequently accepted entries twice. Keep existing demo rate limits.
  select coalesce(sum(requested_quantity),0)+(select count(*) from public.customer_entries e
    where e.customer_id=auth.uid() and e.created_at>clock_timestamp()-interval '1 minute'
      and not exists(select 1 from public.entry_requests x where x.preview_batch_id=e.preview_batch_id))
    into v_count from public.entry_requests where customer_id=auth.uid() and requested_at>clock_timestamp()-interval '1 minute';
  if v_count+p_quantity>10 then raise exception 'Demo limit: ten entries per minute.' using errcode='P0001'; end if;
  select coalesce(sum(requested_quantity),0)+(select count(*) from public.customer_entries e
    where e.customer_id=auth.uid() and e.created_at>clock_timestamp()-interval '24 hours'
      and not exists(select 1 from public.entry_requests x where x.preview_batch_id=e.preview_batch_id))
    into v_count from public.entry_requests where customer_id=auth.uid() and requested_at>clock_timestamp()-interval '24 hours';
  if v_count+p_quantity>100 then raise exception 'Demo limit: one hundred entries per day.' using errcode='P0001'; end if;
  select (select count(*) from public.customer_entries where offering_slug=p_offering_slug)
    +coalesce(sum(requested_quantity),0) into v_count from public.entry_requests where offering_slug=p_offering_slug and status='validating';
  if not o.repeatable_scenario and o.sample_entries::bigint+v_count+p_quantity>o.capacity then
    raise exception 'There are not enough entries remaining for that quantity.' using errcode='P0001'; end if;
  select coalesce(sum(amount) filter(where balance_type='PLAYABLE'),0) into v_balance from public.ledger_entries
    where customer_id=auth.uid() and wallet_account_id=v_wallet;
  if v_balance<o.entry_price_cents*p_quantity then raise exception 'Add demo funds before entering this quantity.' using errcode='P0001'; end if;
  v_now:=clock_timestamp();
  insert into public.entry_requests(customer_id,wallet_account_id,offering_slug,requested_quantity,unit_price_cents,
    idempotency_key,share_with_crew,requested_at,undo_until)
    values(auth.uid(),v_wallet,p_offering_slug,p_quantity,o.entry_price_cents,p_idempotency_key,p_share_with_crew,v_now,v_now+interval '30 seconds') returning * into r;
  insert into demo_private.entry_request_terms(request_id,value_cents,forced_outcome) values(r.id,o.value_cents,o.forced_outcome);
  perform demo_private.post_entry_request_hold(r.id,false);
  insert into public.entry_request_events(request_id,event_name,actor,reason_code) values(r.id,'entry.requested','customer','undo_window');
  return demo_private.entry_request_response(r.id,false);
end $$;
revoke all on function demo_private.request_preview_entries(text,integer,text,boolean) from public,anon,authenticated,service_role;

-- Retain the pre-rollout implementation privately, never as an API bypass.
alter function public.create_preview_entries(text,integer,text) set schema demo_private;
alter function demo_private.create_preview_entries(text,integer,text) rename to create_preview_entries_immediate;
revoke all on function demo_private.create_preview_entries_immediate(text,integer,text) from public,anon,authenticated,service_role;
create function public.create_preview_entries(p_offering_slug text,p_quantity integer,p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
  if (select entry_undo_required from demo_private.funding_config where singleton) then
    return demo_private.request_preview_entries(p_offering_slug,p_quantity,p_idempotency_key,false);
  end if;
  return demo_private.create_preview_entries_immediate(p_offering_slug,p_quantity,p_idempotency_key);
end $$;
revoke all on function public.create_preview_entries(text,integer,text) from public,anon,authenticated,service_role;
grant execute on function public.create_preview_entries(text,integer,text) to authenticated;
-- Recreate the SQL wrapper explicitly (function OID dependencies must not point
-- to the renamed immediate writer).
create or replace function public.create_preview_entry(p_offering_slug text,p_idempotency_key text) returns jsonb
language sql security definer set search_path='' as $$ select public.create_preview_entries(p_offering_slug,1,p_idempotency_key); $$;

alter function public.create_preview_entries_with_sharing(text,integer,text,boolean) set schema demo_private;
alter function demo_private.create_preview_entries_with_sharing(text,integer,text,boolean) rename to create_preview_entries_sharing_immediate;
revoke all on function demo_private.create_preview_entries_sharing_immediate(text,integer,text,boolean) from public,anon,authenticated,service_role;
create function public.create_preview_entries_with_sharing(p_offering_slug text,p_quantity integer,p_idempotency_key text,p_share_with_crew boolean) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
  if (select entry_undo_required from demo_private.funding_config where singleton) then
    return demo_private.request_preview_entries(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew);
  end if;
  return demo_private.create_preview_entries_sharing_immediate(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew);
end $$;
revoke all on function public.create_preview_entries_with_sharing(text,integer,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.create_preview_entries_with_sharing(text,integer,text,boolean) to authenticated;

create function public.resolve_preview_entry_request(p_request_id uuid,p_undo boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
  if auth.uid() is null or p_undo is null or not exists(select 1 from public.entry_requests where id=p_request_id and customer_id=auth.uid()) then
    raise exception 'Entry request unavailable' using errcode='42501'; end if;
  return demo_private.resolve_entry_request(p_request_id,p_undo);
end $$;
revoke all on function public.resolve_preview_entry_request(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.resolve_preview_entry_request(uuid,boolean) to authenticated;

create function public.list_preview_entry_requests() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(demo_private.entry_request_response(r.id,false) order by r.requested_at),'[]'::jsonb)
  from public.entry_requests r where r.customer_id=auth.uid() and
    (r.status='validating' or r.resolved_at>clock_timestamp()-interval '2 minutes');
$$;
revoke all on function public.list_preview_entry_requests() from public,anon,authenticated,service_role;
grant execute on function public.list_preview_entry_requests() to authenticated;

-- No JWT fabrication / service-role API. Only the database scheduler may invoke
-- this private worker; a failed item leaves its hold intact for a safe retry.
create function demo_private.finalize_due_entry_requests() returns integer language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_count integer:=0; v_customers uuid[];
begin
  if not pg_try_advisory_xact_lock(21421000) then return 0; end if;
  -- Acquire the batch's customer locks before any offering lock. Without this,
  -- holding customer A's offering while waiting for customer B could deadlock
  -- against B's concurrent purchase of that offering. Busy customers retry next run.
  select array_agg(c.id) into v_customers from (
    select c.id from public.customers c where exists(select 1 from public.entry_requests r
      where r.customer_id=c.id and r.status='validating' and r.undo_until<=clock_timestamp())
    order by c.id limit 100 for update of c skip locked
  ) c;
  for v_id in select id from public.entry_requests where customer_id=any(v_customers)
    and status='validating' and undo_until<=clock_timestamp() order by undo_until,id limit 100 loop
    begin
      perform demo_private.resolve_entry_request(v_id,false);
      v_count:=v_count+1;
    exception when others then
      raise warning 'Entry request % needs retry (SQLSTATE %)',v_id,sqlstate;
    end;
  end loop;
  return v_count;
end $$;
revoke all on function demo_private.finalize_due_entry_requests() from public,anon,authenticated,service_role;

create or replace function public.get_preview_offering_availability() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug',a.slug,'capacity',a.capacity,'sold',a.sold,
    'remaining',greatest(0,a.capacity-a.sold),'entryPriceCents',a.entry_price_cents,'repeatableScenario',a.repeatable_scenario) order by a.slug),'[]'::jsonb)
  from (select o.slug,o.capacity,o.entry_price_cents,o.repeatable_scenario,
    least(o.capacity,o.sample_entries::bigint+case when o.repeatable_scenario then 0 else
      (select count(*) from public.customer_entries e where e.offering_slug=o.slug)+
      (select coalesce(sum(r.requested_quantity),0) from public.entry_requests r where r.offering_slug=o.slug and r.status='validating') end) as sold
    from demo_private.preview_entry_offerings o where o.active and exists(select 1 from demo_private.funding_config
      where singleton and environment='development-test' and preview_entries_enabled and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1')) a;
$$;
notify pgrst,'reload schema';
commit;
