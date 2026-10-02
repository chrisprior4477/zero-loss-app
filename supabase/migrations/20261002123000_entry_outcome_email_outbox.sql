-- Outcome-email records are separate from financial history. Creating this
-- schema does not send mail or settle any prize. Only an actual offer closure
-- plus an existing final outcome can queue a message.
begin;

create table demo_private.preview_offer_closures (
  offering_slug text primary key references demo_private.preview_entry_offerings(slug) on delete restrict,
  closed_at timestamptz not null default now(),
  close_reason text not null default 'capacity' check (close_reason = 'capacity')
);
alter table demo_private.preview_offer_closures enable row level security;
revoke all on demo_private.preview_offer_closures from public, anon, authenticated, service_role;

create table public.entry_outcome_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  entry_outcome_id uuid not null unique references public.entry_outcomes(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  kind text not null check (kind in ('winner','paid_not_selected')),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  scheduled_for timestamptz not null default (now() + interval '1 minute'),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider_message_id text,
  last_error text check (last_error is null or length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  check ((status = 'sent') = (sent_at is not null))
);
create index entry_outcome_email_due on public.entry_outcome_email_deliveries(scheduled_for,id) where status='pending';
alter table public.entry_outcome_email_deliveries enable row level security;
revoke all on public.entry_outcome_email_deliveries from public, anon, authenticated, service_role;
grant select, update on public.entry_outcome_email_deliveries to service_role;

create function demo_private.queue_outcome_email(p_outcome_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_outcome public.entry_outcomes; v_entry public.customer_entries;
begin
  select * into v_outcome from public.entry_outcomes where id=p_outcome_id;
  if not found then return; end if;
  select * into v_entry from public.customer_entries where id=v_outcome.customer_entry_id;
  if not found or not exists (select 1 from demo_private.preview_offer_closures where offering_slug=v_entry.offering_slug) then return; end if;
  if not coalesce((select entry_outcome_email_enabled from public.customer_communication_preferences where customer_id=v_outcome.customer_id),false) then return; end if;
  insert into public.entry_outcome_email_deliveries(entry_outcome_id,customer_id,kind)
  values(v_outcome.id,v_outcome.customer_id,case when v_outcome.outcome='winner' then 'winner' else 'paid_not_selected' end)
  on conflict(entry_outcome_id) do nothing;
end;
$$;
revoke all on function demo_private.queue_outcome_email(uuid) from public,anon,authenticated,service_role;

create function demo_private.queue_outcome_email_on_result() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform demo_private.queue_outcome_email(new.id);
  return new;
end;
$$;
revoke all on function demo_private.queue_outcome_email_on_result() from public,anon,authenticated,service_role;
create trigger queue_outcome_email_after_result after insert on public.entry_outcomes
for each row execute function demo_private.queue_outcome_email_on_result();

create function demo_private.queue_outcome_emails_on_close() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_outcome_id uuid;
begin
  for v_outcome_id in select o.id from public.entry_outcomes o join public.customer_entries e on e.id=o.customer_entry_id where e.offering_slug=new.offering_slug loop
    perform demo_private.queue_outcome_email(v_outcome_id);
  end loop;
  return new;
end;
$$;
revoke all on function demo_private.queue_outcome_emails_on_close() from public,anon,authenticated,service_role;
create trigger queue_outcome_emails_after_close after insert on demo_private.preview_offer_closures
for each row execute function demo_private.queue_outcome_emails_on_close();

-- The accepted entry transaction locks the offering and writes customer_entries.
-- A non-repeatable offer closes only when its real plus preserved sample count
-- reaches capacity. Showcase repeatable scenarios never auto-close.
create function demo_private.close_full_preview_offering() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_offering demo_private.preview_entry_offerings; v_real bigint;
begin
  select * into v_offering from demo_private.preview_entry_offerings where slug=new.offering_slug;
  if not found or v_offering.repeatable_scenario then return new; end if;
  select count(*) into v_real from public.customer_entries where offering_slug=new.offering_slug;
  if v_offering.sample_entries::bigint + v_real >= v_offering.capacity then
    insert into demo_private.preview_offer_closures(offering_slug,close_reason)
    values(new.offering_slug,'capacity') on conflict(offering_slug) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function demo_private.close_full_preview_offering() from public,anon,authenticated,service_role;
create trigger close_full_preview_offering after insert on public.customer_entries
for each row execute function demo_private.close_full_preview_offering();

-- Claim once. An uncertain provider response stays failed for human review;
-- never silently retry and risk sending a duplicate outcome email.
create function public.claim_outcome_email_deliveries(p_limit integer default 10)
returns setof public.entry_outcome_email_deliveries
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  return query
    with candidates as (
      select d.id from public.entry_outcome_email_deliveries d
      where d.status='pending' and d.scheduled_for<=now()
      order by d.scheduled_for,d.id limit p_limit for update skip locked
    )
    update public.entry_outcome_email_deliveries d
    set status='processing',attempt_count=d.attempt_count+1,updated_at=now()
    from candidates c where d.id=c.id returning d.*;
end;
$$;
revoke all on function public.claim_outcome_email_deliveries(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_outcome_email_deliveries(integer) to service_role;

create function public.finish_outcome_email_delivery(p_id uuid,p_provider_message_id text,p_error text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_id is null or ((p_provider_message_id is null) = (p_error is null)) then raise exception 'Invalid delivery result' using errcode='22023'; end if;
  update public.entry_outcome_email_deliveries
  set status=case when p_provider_message_id is not null then 'sent' else 'failed' end,
      provider_message_id=p_provider_message_id,
      last_error=left(p_error,500),
      sent_at=case when p_provider_message_id is not null then now() else null end,
      updated_at=now()
  where id=p_id and status='processing';
  if not found then raise exception 'Delivery was not processing' using errcode='P0001'; end if;
end;
$$;
revoke all on function public.finish_outcome_email_delivery(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.finish_outcome_email_delivery(uuid,text,text) to service_role;

create function public.get_outcome_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'customerId',d.customer_id,
    'kind',d.kind,
    'entryId',e.entry_id,
    'slug',e.offering_slug,
    'title',f.title,
    'retailer',f.retailer,
    'valueCents',f.value_cents,
    'paidCents',e.amount,
    'completionCents',c.remaining_cents,
    'completionDeadline',c.expires_at,
    'rewardId',r.id,
    'eligible',
      coalesce(p.entry_outcome_email_enabled,false)
      and x.outcome=case when d.kind='winner' then 'winner' else 'not_selected' end
      and (d.kind='winner' and r.id is not null
        or d.kind='paid_not_selected' and c.id is not null and c.expires_at>now()
          and not exists(select 1 from public.completion_option_events ev
            where ev.completion_option_id=c.id and ev.event_type in ('declined','purchased','cancelled','expired')))
  )
  from public.entry_outcome_email_deliveries d
  join public.entry_outcomes x on x.id=d.entry_outcome_id
  join public.customer_entries e on e.id=x.customer_entry_id and e.customer_id=d.customer_id
  join demo_private.preview_entry_offerings f on f.slug=e.offering_slug
  join demo_private.preview_offer_closures closure on closure.offering_slug=e.offering_slug
  left join public.customer_communication_preferences p on p.customer_id=d.customer_id
  left join public.completion_options c on c.customer_entry_id=e.id
  left join public.customer_rewards r on r.customer_entry_id=e.id
  where d.id=p_id and d.status='processing';
$$;
revoke all on function public.get_outcome_email_payload(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_outcome_email_payload(uuid) to service_role;

commit;
