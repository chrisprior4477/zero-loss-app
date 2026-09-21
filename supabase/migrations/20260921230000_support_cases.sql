-- Support owns case workflow only. These functions never post to Ledger,
-- approve value changes, issue rewards, or change an account's eligibility.
begin;
create schema if not exists support_private;
revoke all on schema support_private from public,anon,authenticated,service_role;
create table support_private.staff_access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check(action in ('granted','revoked')),
  reason text not null check(length(btrim(reason)) between 5 and 500),
  occurred_at timestamptz not null default clock_timestamp()
);
alter table support_private.staff_access_events enable row level security;
revoke all on support_private.staff_access_events from public,anon,authenticated,service_role;
create index support_staff_latest on support_private.staff_access_events(user_id,occurred_at desc,id desc);
create trigger support_staff_immutable before update or delete on support_private.staff_access_events for each row execute function public.reject_financial_history_mutation();
create trigger support_staff_no_truncate before truncate on support_private.staff_access_events for each statement execute function public.reject_financial_history_mutation();
create function public.has_support_access() returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select action='granted' from support_private.staff_access_events where user_id=auth.uid() order by occurred_at desc,id desc limit 1),false);
$$;
revoke all on function public.has_support_access() from public,anon,authenticated,service_role;
grant execute on function public.has_support_access() to authenticated;

alter table public.ledger_entries add constraint ledger_support_identity unique(id,customer_id);
create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default ('sup_'||replace(gen_random_uuid()::text,'-','')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  ledger_entry_id uuid,
  category text not null check(category in ('wallet','entry','reward','account','other')),
  subject text not null check(length(btrim(subject)) between 5 and 140),
  status text not null default 'open' check(status in ('open','awaiting_customer','resolved')),
  idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  environment text not null default 'development-test' check(environment='development-test'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(customer_id,idempotency_key),
  foreign key(ledger_entry_id,customer_id) references public.ledger_entries(id,customer_id) on delete restrict
);
create index support_cases_customer on public.support_cases(customer_id,updated_at desc);
create index support_cases_queue on public.support_cases(status,updated_at);
create table public.support_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  actor_kind text not null check(actor_kind in ('customer','staff')),
  event_name text not null check(event_name in ('support.case.opened','support.case.customer_replied','support.case.staff_replied')),
  body text not null check(length(btrim(body)) between 10 and 4000),
  status text not null check(status in ('open','awaiting_customer','resolved')),
  idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id,idempotency_key)
);
create index support_events_case on public.support_case_events(case_id,created_at,id);
create unique index support_case_opened_once on public.support_case_events(case_id) where event_name='support.case.opened';
create index support_events_actor on public.support_case_events(actor_id,created_at desc);
alter table public.support_cases enable row level security;
alter table public.support_case_events enable row level security;
revoke all on public.support_cases,public.support_case_events from public,anon,authenticated,service_role;
grant select on public.support_cases,public.support_case_events to authenticated;
create policy support_case_read on public.support_cases for select to authenticated using(customer_id=auth.uid() or public.has_support_access());
create policy support_event_read on public.support_case_events for select to authenticated using(exists(select 1 from public.support_cases c where c.id=case_id));
create function support_private.guard_case() returns trigger language plpgsql set search_path='' as $$ begin
  if (to_jsonb(new)-array['status','updated_at']) is distinct from (to_jsonb(old)-array['status','updated_at']) then
    raise exception 'Support case identity is immutable' using errcode='55000'; end if;
  return new;
end $$;
revoke all on function support_private.guard_case() from public,anon,authenticated,service_role;
create trigger support_case_guard before update on public.support_cases for each row execute function support_private.guard_case();
create trigger support_case_no_delete before delete on public.support_cases for each row execute function public.reject_financial_history_mutation();
create trigger support_case_no_truncate before truncate on public.support_cases for each statement execute function public.reject_financial_history_mutation();
create trigger support_events_immutable before update or delete on public.support_case_events for each row execute function public.reject_financial_history_mutation();
create trigger support_events_no_truncate before truncate on public.support_case_events for each statement execute function public.reject_financial_history_mutation();

create function public.create_support_case(p_ledger_entry_id uuid,p_category text,p_subject text,p_body text,p_idempotency_key text) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.support_cases; e public.support_case_events;
begin
  if auth.uid() is null then raise exception 'Sign in to contact support' using errcode='42501'; end if;
  if not coalesce((select environment='development-test' and preview_issuer=auth.jwt()->>'iss' from demo_private.funding_config where singleton),false) then
    raise exception 'Support is unavailable in this environment' using errcode='42501'; end if;
  if p_category is null or p_category not in ('wallet','entry','reward','account','other') or p_subject is null or length(btrim(p_subject)) not between 5 and 140
    or p_body is null or length(btrim(p_body)) not between 10 and 4000 or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Check the support form fields' using errcode='22023'; end if;
  -- Support remains available to restricted accounts; no spend eligibility test.
  perform 1 from public.customers where id=auth.uid() for update;
  if not found then raise exception 'Account unavailable' using errcode='42501'; end if;
  select * into c from public.support_cases where customer_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    select * into strict e from public.support_case_events where case_id=c.id and event_name='support.case.opened';
    if c.ledger_entry_id is distinct from p_ledger_entry_id or c.category<>p_category or c.subject<>btrim(p_subject) or e.body<>btrim(p_body) then
      raise exception 'Request key already used for different support details' using errcode='22023'; end if;
    return c.id;
  end if;
  if p_ledger_entry_id is not null and not exists(select 1 from public.ledger_entries where id=p_ledger_entry_id and customer_id=auth.uid() and wallet_scope='demo') then
    raise exception 'Transaction unavailable in your account' using errcode='42501'; end if;
  if (select count(*) from public.support_cases where customer_id=auth.uid() and created_at>clock_timestamp()-interval '10 minutes')>=5 then
    raise exception 'Please use an existing case or wait a few minutes before opening another.' using errcode='P0001'; end if;
  insert into public.support_cases(customer_id,ledger_entry_id,category,subject,idempotency_key)
    values(auth.uid(),p_ledger_entry_id,p_category,btrim(p_subject),p_idempotency_key) returning * into c;
  insert into public.support_case_events(case_id,actor_id,actor_kind,event_name,body,status,idempotency_key)
    values(c.id,auth.uid(),'customer','support.case.opened',btrim(p_body),'open',p_idempotency_key);
  return c.id;
end $$;
revoke all on function public.create_support_case(uuid,text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_support_case(uuid,text,text,text,text) to authenticated;

create function public.reply_support_case(p_case_id uuid,p_body text,p_status text,p_idempotency_key text) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.support_cases; e public.support_case_events; v_staff boolean; v_status text;
begin
  if auth.uid() is null then raise exception 'Sign in to contact support' using errcode='42501'; end if;
  if not coalesce((select environment='development-test' and preview_issuer=auth.jwt()->>'iss' from demo_private.funding_config where singleton),false) then
    raise exception 'Support is unavailable in this environment' using errcode='42501'; end if;
  if p_body is null or length(btrim(p_body)) not between 10 and 4000 or p_status is null or p_status not in ('open','awaiting_customer','resolved')
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then raise exception 'Check your reply' using errcode='22023'; end if;
  -- Shared customer lock bounds reply velocity across cases without deadlocks.
  perform 1 from auth.users where id=auth.uid() for update;
  v_staff:=public.has_support_access();
  select * into c from public.support_cases where id=p_case_id and (customer_id=auth.uid() or v_staff) for update;
  if not found then raise exception 'Support case unavailable' using errcode='42501'; end if;
  -- A staff member replying to their own case acts as the customer.
  v_staff:=v_staff and c.customer_id<>auth.uid();
  if not v_staff and p_status<>'open' then raise exception 'Only support can change review status' using errcode='42501'; end if;
  v_status:=case when v_staff then p_status else 'open' end;
  select * into e from public.support_case_events where actor_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if e.case_id<>c.id or e.body<>btrim(p_body) or e.status<>v_status or e.event_name='support.case.opened' then
      raise exception 'Request key already used for different reply details' using errcode='22023'; end if;
    return c.id;
  end if;
  if (select count(*) from public.support_case_events where actor_id=auth.uid() and created_at>clock_timestamp()-interval '1 minute')>=20 then
    raise exception 'Please wait a moment before sending another reply.' using errcode='P0001'; end if;
  insert into public.support_case_events(case_id,actor_id,actor_kind,event_name,body,status,idempotency_key)
    values(c.id,auth.uid(),case when v_staff then 'staff' else 'customer' end,
      case when v_staff then 'support.case.staff_replied' else 'support.case.customer_replied' end,btrim(p_body),v_status,p_idempotency_key);
  update public.support_cases set status=v_status,updated_at=clock_timestamp() where id=c.id;
  return c.id;
end $$;
revoke all on function public.reply_support_case(uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.reply_support_case(uuid,text,text,text) to authenticated;
-- No staff grants are seeded; assignment requires the owner's explicit choice.
create function public.get_support_case_transaction(p_case_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',l.id,'entry_type',l.entry_type,'amount',l.amount,'created_at',l.created_at)
  from public.support_cases c join public.ledger_entries l on l.id=c.ledger_entry_id and l.customer_id=c.customer_id
  where c.id=p_case_id and (c.customer_id=auth.uid() or public.has_support_access());
$$;
revoke all on function public.get_support_case_transaction(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_support_case_transaction(uuid) to authenticated;
commit;
