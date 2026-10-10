-- Start a new, narrow purchase-option reminder program. Historical rows are
-- never mailed on cutover; #2 already covers the initial option notice.
begin;

update public.completion_option_reminders
set status='cancelled',updated_at=now()
where status='pending';

create or replace function demo_private.schedule_completion_option_reminders()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.completion_option_reminders(completion_option_id,customer_id,reminder_key,scheduled_for)
  values
    (new.id,new.customer_id,'7d',new.expires_at-interval '7 days'),
    (new.id,new.customer_id,'24h',new.expires_at-interval '24 hours')
  on conflict(completion_option_id,reminder_key) do nothing;
  return new;
end;
$$;
revoke all on function demo_private.schedule_completion_option_reminders() from public,anon,authenticated,service_role;

create table demo_private.purchase_option_email_worker_config (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table demo_private.purchase_option_email_worker_config enable row level security;
revoke all on demo_private.purchase_option_email_worker_config from public,anon,authenticated,service_role;
insert into demo_private.purchase_option_email_worker_config(singleton,enabled) values(true,false);

create function public.claim_purchase_option_email_reminders(p_limit integer default 10)
returns setof public.completion_option_reminders
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  if not coalesce((select enabled from demo_private.purchase_option_email_worker_config where singleton),false) then return; end if;
  return query
    with candidates as (
      select r.id from public.completion_option_reminders r
      where r.status='pending' and r.reminder_key in ('7d','24h')
        and r.scheduled_for<=now() and r.scheduled_for>now()-interval '1 day'
      order by r.scheduled_for,r.id limit p_limit for update skip locked
    )
    update public.completion_option_reminders r
    set status='processing',attempt_count=r.attempt_count+1,updated_at=now()
    from candidates c where r.id=c.id returning r.*;
end;
$$;
revoke all on function public.claim_purchase_option_email_reminders(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_purchase_option_email_reminders(integer) to service_role;

create function public.get_purchase_option_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'customerId',r.customer_id,
    'title',o.title,
    'retailer',o.retailer,
    'valueCents',o.value_cents,
    'remainingCents',c.remaining_cents,
    'deadline',c.expires_at,
    'reminderKey',r.reminder_key,
    'entryId',e.entry_id,
    'slug',e.offering_slug,
    'eligible',
      r.status='processing' and r.scheduled_for<=now() and r.scheduled_for>now()-interval '1 day'
      and c.expires_at>now()
      and coalesce(p.purchase_option_email_enabled,true)
      and not exists(select 1 from public.completion_option_events ev
        where ev.completion_option_id=c.id and ev.event_type in ('declined','purchased','cancelled','expired'))
  )
  from public.completion_option_reminders r
  join public.completion_options c on c.id=r.completion_option_id and c.customer_id=r.customer_id
  join public.customer_entries e on e.id=c.customer_entry_id and e.customer_id=r.customer_id
  join demo_private.preview_entry_offerings o on o.slug=e.offering_slug
  left join public.customer_communication_preferences p on p.customer_id=r.customer_id
  where r.id=p_id and r.status='processing' and r.reminder_key in ('7d','24h');
$$;
revoke all on function public.get_purchase_option_email_payload(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_purchase_option_email_payload(uuid) to service_role;

create function public.finish_purchase_option_email_reminder(
  p_id uuid,p_provider_message_id text,p_error text,p_cancelled boolean default false
) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_id is null or p_cancelled is null or
    (p_cancelled and (p_provider_message_id is not null or p_error is not null)) or
    (not p_cancelled and ((p_provider_message_id is null) = (p_error is null))) then
    raise exception 'Invalid delivery result' using errcode='22023';
  end if;
  update public.completion_option_reminders
  set status=case when p_cancelled then 'cancelled' when p_provider_message_id is not null then 'sent' else 'failed' end,
      provider_message_id=p_provider_message_id,last_error=left(p_error,1000),
      sent_at=case when p_provider_message_id is not null then now() else null end,updated_at=now()
  where id=p_id and status='processing';
  if not found then raise exception 'Reminder was not processing' using errcode='P0001'; end if;
end;
$$;
revoke all on function public.finish_purchase_option_email_reminder(uuid,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.finish_purchase_option_email_reminder(uuid,text,text,boolean) to service_role;

create function demo_private.invoke_purchase_option_email_worker() returns void
language plpgsql security definer set search_path='' as $$
declare v_token text; v_anon_jwt text;
begin
  if not coalesce((select enabled from demo_private.purchase_option_email_worker_config where singleton),false) then return; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='purchase_option_email_worker_token';
  select decrypted_secret into v_anon_jwt from vault.decrypted_secrets where name='outcome_email_worker_anon_jwt';
  if v_token is null or v_anon_jwt is null then
    raise warning 'Purchase-option email worker secrets are missing';
    return;
  end if;
  perform net.http_post(
    url:='https://ocgdfnvvjvutevgqzzgj.supabase.co/functions/v1/send-purchase-option-emails',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_jwt,
      'X-Purchase-Option-Email-Worker-Token',v_token),
    body:='{}'::jsonb,timeout_milliseconds:=10000
  );
end;
$$;
revoke all on function demo_private.invoke_purchase_option_email_worker() from public,anon,authenticated,service_role;
select cron.schedule('zero-loss-purchase-option-email-worker','* * * * *',
  'select demo_private.invoke_purchase_option_email_worker();');

notify pgrst,'reload schema';
commit;
