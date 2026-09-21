-- Durable receipt recovery and compare-and-submit: a stale page returns the
-- original result, not another debit. No time-based expiry of recovery evidence.
begin;
alter table demo_private.funding_config add column entry_recovery_required boolean not null default false;
create index entry_requests_latest_prize on public.entry_requests(customer_id,offering_slug,requested_at desc,id desc);
alter table public.entry_requests add constraint entry_requests_identity unique(id,customer_id);

create table public.entry_request_receipt_acknowledgments (
  request_id uuid primary key references public.entry_requests(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  acknowledged_at timestamptz not null default clock_timestamp(),
  foreign key(request_id,customer_id) references public.entry_requests(id,customer_id) on delete restrict
);
alter table public.entry_request_receipt_acknowledgments enable row level security;
revoke all on public.entry_request_receipt_acknowledgments from public,anon,authenticated,service_role;
grant select on public.entry_request_receipt_acknowledgments to authenticated;
create policy entry_receipt_ack_owner on public.entry_request_receipt_acknowledgments for select to authenticated using(customer_id=auth.uid());
create trigger entry_receipt_ack_immutable before update or delete on public.entry_request_receipt_acknowledgments for each row execute function public.reject_financial_history_mutation();
create trigger entry_receipt_ack_no_truncate before truncate on public.entry_request_receipt_acknowledgments for each statement execute function public.reject_financial_history_mutation();

-- Aliases preserve the original answer even when a stale page supplied a new
-- key and was redirected to an existing submission. This is not a second Entry.
create table demo_private.entry_request_attempts (
  customer_id uuid not null references public.customers(id) on delete restrict,
  idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  offering_slug text not null references demo_private.preview_entry_offerings(slug) on delete restrict,
  quantity integer not null check(quantity between 1 and 10),
  share_with_crew boolean not null,
  previous_request_id uuid references public.entry_requests(id) on delete restrict,
  request_id uuid not null references public.entry_requests(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  primary key(customer_id,idempotency_key),
  foreign key(request_id,customer_id) references public.entry_requests(id,customer_id) on delete restrict,
  foreign key(previous_request_id,customer_id) references public.entry_requests(id,customer_id) on delete restrict
);
alter table demo_private.entry_request_attempts enable row level security;
revoke all on demo_private.entry_request_attempts from public,anon,authenticated,service_role;
create trigger entry_attempt_immutable before update or delete on demo_private.entry_request_attempts for each row execute function public.reject_financial_history_mutation();
create trigger entry_attempt_no_truncate before truncate on demo_private.entry_request_attempts for each statement execute function public.reject_financial_history_mutation();

alter function demo_private.request_preview_entries(text,integer,text,boolean) rename to request_preview_entries_original;
revoke all on function demo_private.request_preview_entries_original(text,integer,text,boolean) from public,anon,authenticated,service_role;

create function public.submit_preview_entries(p_offering_slug text,p_quantity integer,p_idempotency_key text,p_share_with_crew boolean,p_previous_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.entry_requests; a demo_private.entry_request_attempts; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_quantity is null or p_quantity not between 1 and 10 or p_share_with_crew is null
    or p_offering_slug is null or p_offering_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid entry request' using errcode='22023'; end if;
  if not coalesce((select entry_undo_required and preview_entries_enabled and environment='development-test' and preview_issuer=auth.jwt()->>'iss'
    from demo_private.funding_config where singleton),false) then raise exception 'Preview entries unavailable' using errcode='42501'; end if;
  -- Same lock as the writer and worker; compare and create cannot race.
  perform demo_private.lock_funding_wallet();
  select * into a from demo_private.entry_request_attempts where customer_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if a.offering_slug<>p_offering_slug or a.quantity<>p_quantity or a.share_with_crew<>p_share_with_crew
      or a.previous_request_id is distinct from p_previous_request_id then
      raise exception 'Idempotency key belongs to a different entry request' using errcode='22023'; end if;
    return demo_private.entry_request_response(a.request_id,true);
  end if;
  -- Preserve replay of pre-upgrade requests before consulting the latest record.
  if exists(select 1 from public.entry_requests where customer_id=auth.uid() and idempotency_key=p_idempotency_key)
    or exists(select 1 from public.preview_entry_batches where customer_id=auth.uid() and idempotency_key=p_idempotency_key) then
    return demo_private.request_preview_entries_original(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew);
  end if;
  if p_previous_request_id is not null and not exists(select 1 from public.entry_requests
    where id=p_previous_request_id and customer_id=auth.uid() and offering_slug=p_offering_slug) then
    raise exception 'Entry request unavailable' using errcode='42501'; end if;
  if (select count(*) from demo_private.entry_request_attempts where customer_id=auth.uid() and created_at>clock_timestamp()-interval '1 minute')>=120 then
    raise exception 'Too many entry checks. Please wait a moment.' using errcode='P0001'; end if;
  select * into r from public.entry_requests where customer_id=auth.uid() and offering_slug=p_offering_slug
    order by requested_at desc,id desc limit 1;
  if found and (r.status='validating' or r.id is distinct from p_previous_request_id) then
    v_result:=demo_private.entry_request_response(r.id,true);
  else
    v_result:=demo_private.request_preview_entries_original(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew);
    if p_previous_request_id is not null then
      insert into public.entry_request_receipt_acknowledgments(request_id,customer_id)
        values(p_previous_request_id,auth.uid()) on conflict do nothing;
    end if;
  end if;
  insert into demo_private.entry_request_attempts(customer_id,idempotency_key,offering_slug,quantity,share_with_crew,previous_request_id,request_id)
    values(auth.uid(),p_idempotency_key,p_offering_slug,p_quantity,p_share_with_crew,p_previous_request_id,(v_result->>'requestId')::uuid);
  return v_result;
end $$;
revoke all on function public.submit_preview_entries(text,integer,text,boolean,uuid) from public,anon,authenticated,service_role;
grant execute on function public.submit_preview_entries(text,integer,text,boolean,uuid) to authenticated;

-- Legacy clients also fail safe once the compatible application is deployed.
create function demo_private.request_preview_entries(p_offering_slug text,p_quantity integer,p_idempotency_key text,p_share_with_crew boolean)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
  if (select entry_recovery_required from demo_private.funding_config where singleton) then
    return public.submit_preview_entries(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew,null);
  end if;
  return demo_private.request_preview_entries_original(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew);
end $$;
revoke all on function demo_private.request_preview_entries(text,integer,text,boolean) from public,anon,authenticated,service_role;
-- Recompile public wrappers so cached function references cannot retain the
-- renamed writer. Old clients can recover, but cannot silently repeat a debit.
create or replace function public.create_preview_entries(p_offering_slug text,p_quantity integer,p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
  if (select entry_undo_required from demo_private.funding_config where singleton) then
    return demo_private.request_preview_entries(p_offering_slug,p_quantity,p_idempotency_key,false);
  end if;
  return demo_private.create_preview_entries_immediate(p_offering_slug,p_quantity,p_idempotency_key);
end $$;
create or replace function public.create_preview_entries_with_sharing(p_offering_slug text,p_quantity integer,p_idempotency_key text,p_share_with_crew boolean) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
  if (select entry_undo_required from demo_private.funding_config where singleton) then
    return demo_private.request_preview_entries(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew);
  end if;
  return demo_private.create_preview_entries_sharing_immediate(p_offering_slug,p_quantity,p_idempotency_key,p_share_with_crew);
end $$;

create function public.acknowledge_entry_receipt(p_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
  if auth.uid() is null or not exists(select 1 from public.entry_requests where id=p_request_id and customer_id=auth.uid() and status<>'validating') then
    raise exception 'Completed entry request unavailable' using errcode='42501'; end if;
  insert into public.entry_request_receipt_acknowledgments(request_id,customer_id) values(p_request_id,auth.uid()) on conflict do nothing;
end $$;
revoke all on function public.acknowledge_entry_receipt(uuid) from public,anon,authenticated,service_role;
grant execute on function public.acknowledge_entry_receipt(uuid) to authenticated;

create or replace function public.list_preview_entry_requests() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(demo_private.entry_request_response(r.id,false) order by r.requested_at,r.id),'[]'::jsonb)
  from (select r.* from public.entry_requests r where r.customer_id=auth.uid()
    and (r.status='validating' or not exists(select 1 from public.entry_request_receipt_acknowledgments a where a.request_id=r.id))
    order by (r.status='validating') desc,r.requested_at desc,r.id desc limit 50) r;
$$;
commit;
