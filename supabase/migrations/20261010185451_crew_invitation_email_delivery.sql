-- Email only newly created, real Crew requests for confirmed accounts. The
-- existing pending invitation is intentionally not backfilled or mailed.
begin;

create table public.crew_invitation_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.crew_invitations(id) on delete restrict,
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
create index crew_invitation_email_due
  on public.crew_invitation_email_deliveries(scheduled_for,id) where status='pending';
alter table public.crew_invitation_email_deliveries enable row level security;
revoke all on public.crew_invitation_email_deliveries from public,anon,authenticated,service_role;
grant select,update on public.crew_invitation_email_deliveries to service_role;

create function demo_private.queue_crew_invitation_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status = 'pending' and exists (
    select 1 from auth.users u
    where u.id = new.recipient_id and u.email is not null and u.email_confirmed_at is not null
  ) then
    insert into public.crew_invitation_email_deliveries(invitation_id)
    values(new.id) on conflict(invitation_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function demo_private.queue_crew_invitation_email() from public,anon,authenticated,service_role;
create trigger queue_crew_invitation_email_after_insert
  after insert on public.crew_invitations for each row
  execute function demo_private.queue_crew_invitation_email();

create table demo_private.crew_invitation_email_worker_config (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table demo_private.crew_invitation_email_worker_config enable row level security;
revoke all on demo_private.crew_invitation_email_worker_config from public,anon,authenticated,service_role;
insert into demo_private.crew_invitation_email_worker_config(singleton,enabled) values(true,false);

create function public.claim_crew_invitation_email_deliveries(p_limit integer default 10)
returns setof public.crew_invitation_email_deliveries
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then
    raise exception 'Invalid batch size' using errcode='22023';
  end if;
  if not coalesce((select enabled from demo_private.crew_invitation_email_worker_config where singleton),false) then return; end if;
  return query
    with candidates as (
      select d.id from public.crew_invitation_email_deliveries d
      where d.status='pending' and d.scheduled_for<=now()
      order by d.scheduled_for,d.id limit p_limit for update skip locked
    )
    update public.crew_invitation_email_deliveries d
    set status='processing',attempt_count=d.attempt_count+1,updated_at=now()
    from candidates c where d.id=c.id returning d.*;
end;
$$;
revoke all on function public.claim_crew_invitation_email_deliveries(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_crew_invitation_email_deliveries(integer) to service_role;

create function public.get_crew_invitation_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'recipientId',i.recipient_id,
    'requesterName',i.requester_name,
    'eligible',i.status='pending' and u.email is not null and u.email_confirmed_at is not null
  )
  from public.crew_invitation_email_deliveries d
  join public.crew_invitations i on i.id=d.invitation_id
  left join auth.users u on u.id=i.recipient_id
  where d.id=p_id and d.status='processing';
$$;
revoke all on function public.get_crew_invitation_email_payload(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_crew_invitation_email_payload(uuid) to service_role;

create function public.finish_crew_invitation_email_delivery(
  p_id uuid,p_provider_message_id text,p_error text,p_cancelled boolean default false
) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_id is null or p_cancelled is null or
    (p_cancelled and (p_provider_message_id is not null or p_error is not null)) or
    (not p_cancelled and ((p_provider_message_id is null) = (p_error is null))) then
    raise exception 'Invalid delivery result' using errcode='22023';
  end if;
  update public.crew_invitation_email_deliveries
  set status=case when p_cancelled then 'cancelled' when p_provider_message_id is not null then 'sent' else 'failed' end,
      provider_message_id=p_provider_message_id,
      last_error=left(p_error,500),
      sent_at=case when p_provider_message_id is not null then now() else null end,
      updated_at=now()
  where id=p_id and status='processing';
  if not found then raise exception 'Delivery was not processing' using errcode='P0001'; end if;
end;
$$;
revoke all on function public.finish_crew_invitation_email_delivery(uuid,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.finish_crew_invitation_email_delivery(uuid,text,text,boolean) to service_role;

create function demo_private.invoke_crew_invitation_email_worker() returns void
language plpgsql security definer set search_path='' as $$
declare v_token text; v_anon_jwt text;
begin
  if not coalesce((select enabled from demo_private.crew_invitation_email_worker_config where singleton),false) then return; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='crew_invitation_email_worker_token';
  select decrypted_secret into v_anon_jwt from vault.decrypted_secrets where name='outcome_email_worker_anon_jwt';
  if v_token is null or v_anon_jwt is null then
    raise warning 'Crew invitation email worker secrets are missing';
    return;
  end if;
  perform net.http_post(
    url:='https://ocgdfnvvjvutevgqzzgj.supabase.co/functions/v1/send-crew-invitations',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || v_anon_jwt,
      'X-Crew-Email-Worker-Token',v_token
    ),
    body:='{}'::jsonb,
    timeout_milliseconds:=10000
  );
end;
$$;
revoke all on function demo_private.invoke_crew_invitation_email_worker() from public,anon,authenticated,service_role;
select cron.schedule('zero-loss-crew-invitation-email-worker','* * * * *',
  'select demo_private.invoke_crew_invitation_email_worker();');

notify pgrst, 'reload schema';
commit;
