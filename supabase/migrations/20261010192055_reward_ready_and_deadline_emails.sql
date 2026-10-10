-- Fresh, future-only reward messages. Preserve credential creation and claim
-- behavior; do not revive historical reminder rows.
begin;

update public.reward_claim_reminders set status='cancelled',updated_at=now()
where status='pending';

create or replace function demo_private.initialize_reward_delivery()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into demo_private.reward_credentials(reward_id,provider_reference,credential)
  values(new.id,'preview_'||replace(gen_random_uuid()::text,'-',''),
    lpad((floor(random()*1000000000000))::bigint::text,12,'0'));
  insert into public.reward_claim_reminders(reward_id,customer_id,reminder_key,scheduled_for)
  values
    (new.id,new.customer_id,'7d',new.claim_expires_at-interval '7 days'),
    (new.id,new.customer_id,'1d',new.claim_expires_at-interval '1 day')
  on conflict(reward_id,reminder_key) do nothing;
  return new;
end;
$$;
revoke all on function demo_private.initialize_reward_delivery() from public,anon,authenticated,service_role;

create function demo_private.reschedule_reward_claim_reminders() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_deadline timestamptz;
begin
  if new.event_type<>'claim_extended' then return new; end if;
  v_deadline:=demo_private.reward_deadline(new.reward_id);
  update public.reward_claim_reminders
  set scheduled_for=case reminder_key when '7d' then v_deadline-interval '7 days'
    when '1d' then v_deadline-interval '1 day' else scheduled_for end,updated_at=now()
  where reward_id=new.reward_id and status='pending' and reminder_key in ('7d','1d');
  return new;
end;
$$;
revoke all on function demo_private.reschedule_reward_claim_reminders() from public,anon,authenticated,service_role;
create trigger reschedule_reward_claim_reminders_after_event
  after insert on public.reward_events for each row
  execute function demo_private.reschedule_reward_claim_reminders();

create table public.reward_ready_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null unique references public.customer_rewards(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'pending' check(status in ('pending','processing','sent','failed','cancelled')),
  scheduled_for timestamptz not null default(now()+interval '1 minute'),
  attempt_count integer not null default 0 check(attempt_count>=0),
  provider_message_id text,
  last_error text check(last_error is null or length(last_error)<=500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  check((status='sent')=(sent_at is not null))
);
create index reward_ready_email_due on public.reward_ready_email_deliveries(scheduled_for,id) where status='pending';
alter table public.reward_ready_email_deliveries enable row level security;
revoke all on public.reward_ready_email_deliveries from public,anon,authenticated,service_role;
grant select,update on public.reward_ready_email_deliveries to service_role;

create function demo_private.queue_purchase_reward_ready_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.source='purchase' then
    insert into public.reward_ready_email_deliveries(reward_id,customer_id)
    values(new.id,new.customer_id) on conflict(reward_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function demo_private.queue_purchase_reward_ready_email() from public,anon,authenticated,service_role;
create trigger queue_purchase_reward_ready_email_after_insert
  after insert on public.customer_rewards for each row
  execute function demo_private.queue_purchase_reward_ready_email();

create function demo_private.queue_delayed_winner_reward_ready_email() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_reward public.customer_rewards;
begin
  if new.event_type<>'issuance_ready' or not exists(
    select 1 from public.reward_events e where e.reward_id=new.reward_id
      and e.event_type in ('issuance_pending','issuance_failed') and e.created_at<new.created_at
  ) then return new; end if;
  select * into v_reward from public.customer_rewards where id=new.reward_id and source='winner';
  if found then
    insert into public.reward_ready_email_deliveries(reward_id,customer_id)
    values(v_reward.id,v_reward.customer_id) on conflict(reward_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function demo_private.queue_delayed_winner_reward_ready_email() from public,anon,authenticated,service_role;
create trigger queue_delayed_winner_reward_ready_email_after_event
  after insert on public.reward_events for each row
  execute function demo_private.queue_delayed_winner_reward_ready_email();

create table demo_private.reward_email_worker_config (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,updated_at timestamptz not null default now()
);
alter table demo_private.reward_email_worker_config enable row level security;
revoke all on demo_private.reward_email_worker_config from public,anon,authenticated,service_role;
insert into demo_private.reward_email_worker_config(singleton,enabled) values(true,false);

create function public.claim_reward_ready_email_deliveries(p_limit integer default 10)
returns setof public.reward_ready_email_deliveries
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  if not coalesce((select enabled from demo_private.reward_email_worker_config where singleton),false) then return; end if;
  return query
    with candidates as (
      select d.id from public.reward_ready_email_deliveries d
      where d.status='pending' and d.scheduled_for<=now()
      order by d.scheduled_for,d.id limit p_limit for update skip locked
    )
    update public.reward_ready_email_deliveries d
    set status='processing',attempt_count=d.attempt_count+1,updated_at=now()
    from candidates c where d.id=c.id returning d.*;
end;
$$;
revoke all on function public.claim_reward_ready_email_deliveries(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_reward_ready_email_deliveries(integer) to service_role;

create function public.get_reward_ready_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'customerId',d.customer_id,'rewardId',r.id,'slug',e.offering_slug,
    'title',o.title,'retailer',r.retailer,'valueCents',r.face_value_cents,
    'eligible',d.status='processing' and demo_private.reward_status(r.id)='ready'
      and not exists(select 1 from public.reward_events ev where ev.reward_id=r.id and ev.event_type in ('claimed','redeemed','expired','cancelled'))
  )
  from public.reward_ready_email_deliveries d
  join public.customer_rewards r on r.id=d.reward_id and r.customer_id=d.customer_id
  join public.customer_entries e on e.id=r.customer_entry_id
  join demo_private.preview_entry_offerings o on o.slug=e.offering_slug
  where d.id=p_id and d.status='processing';
$$;
revoke all on function public.get_reward_ready_email_payload(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_reward_ready_email_payload(uuid) to service_role;

create function public.finish_reward_ready_email_delivery(p_id uuid,p_provider_message_id text,p_error text,p_cancelled boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_id is null or p_cancelled is null or
    (p_cancelled and (p_provider_message_id is not null or p_error is not null)) or
    (not p_cancelled and ((p_provider_message_id is null)=(p_error is null))) then
    raise exception 'Invalid delivery result' using errcode='22023';
  end if;
  update public.reward_ready_email_deliveries
  set status=case when p_cancelled then 'cancelled' when p_provider_message_id is not null then 'sent' else 'failed' end,
      provider_message_id=p_provider_message_id,last_error=left(p_error,500),
      sent_at=case when p_provider_message_id is not null then now() else null end,updated_at=now()
  where id=p_id and status='processing';
  if not found then raise exception 'Ready email was not processing' using errcode='P0001'; end if;
end;
$$;
revoke all on function public.finish_reward_ready_email_delivery(uuid,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.finish_reward_ready_email_delivery(uuid,text,text,boolean) to service_role;

create function public.claim_reward_deadline_email_reminders(p_limit integer default 10)
returns setof public.reward_claim_reminders
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  if not coalesce((select enabled from demo_private.reward_email_worker_config where singleton),false) then return; end if;
  return query
    with candidates as (
      select r.id from public.reward_claim_reminders r
      where r.status='pending' and r.reminder_key in ('7d','1d')
        and r.scheduled_for<=now() and r.scheduled_for>now()-interval '1 day'
      order by r.scheduled_for,r.id limit p_limit for update skip locked
    )
    update public.reward_claim_reminders r
    set status='processing',attempt_count=r.attempt_count+1,updated_at=now()
    from candidates c where r.id=c.id returning r.*;
end;
$$;
revoke all on function public.claim_reward_deadline_email_reminders(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_reward_deadline_email_reminders(integer) to service_role;

create function public.get_reward_deadline_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'customerId',m.customer_id,'rewardId',r.id,'slug',e.offering_slug,
    'title',o.title,'retailer',r.retailer,'valueCents',r.face_value_cents,
    'deadline',demo_private.reward_deadline(r.id),'reminderKey',m.reminder_key,
    'eligible',m.status='processing' and m.scheduled_for<=now()
      and m.scheduled_for>now()-interval '1 day' and demo_private.reward_deadline(r.id)>now()
      and m.scheduled_for=demo_private.reward_deadline(r.id)-case m.reminder_key
        when '7d' then interval '7 days' else interval '1 day' end
      and demo_private.reward_status(r.id)='ready'
      and not exists(select 1 from public.reward_events ev where ev.reward_id=r.id
        and ev.event_type in ('claimed','redeemed','expired','cancelled'))
  )
  from public.reward_claim_reminders m
  join public.customer_rewards r on r.id=m.reward_id and r.customer_id=m.customer_id
  join public.customer_entries e on e.id=r.customer_entry_id
  join demo_private.preview_entry_offerings o on o.slug=e.offering_slug
  where m.id=p_id and m.status='processing' and m.reminder_key in ('7d','1d');
$$;
revoke all on function public.get_reward_deadline_email_payload(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_reward_deadline_email_payload(uuid) to service_role;

create function public.finish_reward_deadline_email_reminder(p_id uuid,p_provider_message_id text,p_error text,p_cancelled boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_id is null or p_cancelled is null or
    (p_cancelled and (p_provider_message_id is not null or p_error is not null)) or
    (not p_cancelled and ((p_provider_message_id is null)=(p_error is null))) then
    raise exception 'Invalid delivery result' using errcode='22023';
  end if;
  update public.reward_claim_reminders
  set status=case when p_cancelled then 'cancelled' when p_provider_message_id is not null then 'sent' else 'failed' end,
      provider_message_id=p_provider_message_id,last_error=left(p_error,1000),
      sent_at=case when p_provider_message_id is not null then now() else null end,updated_at=now()
  where id=p_id and status='processing';
  if not found then raise exception 'Claim reminder was not processing' using errcode='P0001'; end if;
end;
$$;
revoke all on function public.finish_reward_deadline_email_reminder(uuid,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.finish_reward_deadline_email_reminder(uuid,text,text,boolean) to service_role;

create function demo_private.invoke_reward_email_worker() returns void
language plpgsql security definer set search_path='' as $$
declare v_token text; v_anon_jwt text;
begin
  if not coalesce((select enabled from demo_private.reward_email_worker_config where singleton),false) then return; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='reward_email_worker_token';
  select decrypted_secret into v_anon_jwt from vault.decrypted_secrets where name='outcome_email_worker_anon_jwt';
  if v_token is null or v_anon_jwt is null then raise warning 'Reward email worker secrets are missing'; return; end if;
  perform net.http_post(
    url:='https://ocgdfnvvjvutevgqzzgj.supabase.co/functions/v1/send-reward-emails',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_jwt,
      'X-Reward-Email-Worker-Token',v_token),body:='{}'::jsonb,timeout_milliseconds:=10000
  );
end;
$$;
revoke all on function demo_private.invoke_reward_email_worker() from public,anon,authenticated,service_role;
select cron.schedule('zero-loss-reward-email-worker','* * * * *',
  'select demo_private.invoke_reward_email_worker();');

notify pgrst,'reload schema';
commit;
