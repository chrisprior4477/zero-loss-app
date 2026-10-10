-- A one-time email per selected real Crew member and prize. Sample profiles
-- have no customer IDs and cannot enter this durable outbox.
begin;

create table public.crew_prize_share_emails (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.customers(id) on delete restrict,
  recipient_id uuid not null references public.customers(id) on delete restrict,
  offering_slug text not null references demo_private.preview_entry_offerings(slug) on delete restrict,
  status text not null default 'pending' check(status in ('pending','processing','sent','failed','cancelled')),
  scheduled_for timestamptz not null default(now()+interval '1 minute'),
  attempt_count integer not null default 0 check(attempt_count>=0),
  provider_message_id text,
  last_error text check(last_error is null or length(last_error)<=500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(sender_id,recipient_id,offering_slug),
  check(sender_id<>recipient_id),
  check((status='sent')=(sent_at is not null))
);
create index crew_prize_share_emails_due on public.crew_prize_share_emails(scheduled_for,id) where status='pending';
alter table public.crew_prize_share_emails enable row level security;
revoke all on public.crew_prize_share_emails from public,anon,authenticated,service_role;
grant select,update on public.crew_prize_share_emails to service_role;

create function public.share_prize_with_crew(p_offering_slug text,p_recipient_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_sender uuid:=auth.uid(); v_count integer; v_new_count integer; v_inserted integer;
begin
  if v_sender is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_offering_slug is null or not exists(select 1 from demo_private.preview_entry_offerings where slug=p_offering_slug) then
    raise exception 'Prize unavailable' using errcode='22023';
  end if;
  if p_recipient_ids is null or cardinality(p_recipient_ids) not between 1 and 20 or
    exists(select 1 from unnest(p_recipient_ids) id where id is null or id=v_sender) or
    (select count(distinct id) from unnest(p_recipient_ids) id)<>cardinality(p_recipient_ids) then
    raise exception 'Choose 1 to 20 different Crew members' using errcode='22023';
  end if;
  if not exists(select 1 from auth.users where id=v_sender and email_confirmed_at is not null) then
    raise exception 'Confirm your email before sharing' using errcode='42501';
  end if;
  -- Serialize this sender's batches so the daily cap cannot be raced.
  perform 1 from public.customers where id=v_sender for update;
  if exists(
    select 1 from unnest(p_recipient_ids) recipient(id)
    where not exists(
      select 1 from public.crew_invitations c join auth.users u on u.id=recipient.id and u.email_confirmed_at is not null
      where c.status='accepted' and
        ((c.requester_id=v_sender and c.recipient_id=recipient.id) or
         (c.recipient_id=v_sender and c.requester_id=recipient.id))
    )
  ) then raise exception 'Choose only approved Crew members' using errcode='42501'; end if;
  select count(*) into v_count from public.crew_prize_share_emails
    where sender_id=v_sender and created_at>now()-interval '1 day';
  select count(*) into v_new_count from unnest(p_recipient_ids) recipient(id)
    where not exists(select 1 from public.crew_prize_share_emails s
      where s.sender_id=v_sender and s.recipient_id=recipient.id and s.offering_slug=p_offering_slug);
  if v_count+v_new_count>20 then
    raise exception 'Crew email limit reached for today' using errcode='P0001';
  end if;
  insert into public.crew_prize_share_emails(sender_id,recipient_id,offering_slug)
    select v_sender,id,p_offering_slug from unnest(p_recipient_ids) id
    on conflict(sender_id,recipient_id,offering_slug) do nothing;
  get diagnostics v_inserted=row_count;
  return jsonb_build_object('queued',v_inserted,'alreadyShared',cardinality(p_recipient_ids)-v_inserted);
end;
$$;
revoke all on function public.share_prize_with_crew(text,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.share_prize_with_crew(text,uuid[]) to authenticated;

create table demo_private.crew_prize_share_email_worker_config (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,updated_at timestamptz not null default now()
);
alter table demo_private.crew_prize_share_email_worker_config enable row level security;
revoke all on demo_private.crew_prize_share_email_worker_config from public,anon,authenticated,service_role;
insert into demo_private.crew_prize_share_email_worker_config(singleton,enabled) values(true,false);

create function public.claim_crew_prize_share_emails(p_limit integer default 10)
returns setof public.crew_prize_share_emails
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  if not coalesce((select enabled from demo_private.crew_prize_share_email_worker_config where singleton),false) then return; end if;
  return query
    with candidates as (
      select s.id from public.crew_prize_share_emails s
      where s.status='pending' and s.scheduled_for<=now()
      order by s.scheduled_for,s.id limit p_limit for update skip locked
    )
    update public.crew_prize_share_emails s
    set status='processing',attempt_count=s.attempt_count+1,updated_at=now()
    from candidates c where s.id=c.id returning s.*;
end;
$$;
revoke all on function public.claim_crew_prize_share_emails(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_crew_prize_share_emails(integer) to service_role;

create function public.get_crew_prize_share_email_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'recipientId',s.recipient_id,
    'senderName',coalesce(nullif(btrim(p.display_name),''),nullif(btrim(p.legal_first_name),''),'A Crew member'),
    'title',o.title,
    'slug',s.offering_slug,
    'eligible',s.status='processing' and u.email is not null and u.email_confirmed_at is not null
      and exists(select 1 from public.crew_invitations c where c.status='accepted' and
        ((c.requester_id=s.sender_id and c.recipient_id=s.recipient_id) or
         (c.recipient_id=s.sender_id and c.requester_id=s.recipient_id)))
  )
  from public.crew_prize_share_emails s
  join demo_private.preview_entry_offerings o on o.slug=s.offering_slug
  left join public.customer_profiles p on p.customer_id=s.sender_id
  left join auth.users u on u.id=s.recipient_id
  where s.id=p_id and s.status='processing';
$$;
revoke all on function public.get_crew_prize_share_email_payload(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_crew_prize_share_email_payload(uuid) to service_role;

create function public.finish_crew_prize_share_email(p_id uuid,p_provider_message_id text,p_error text,p_cancelled boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_id is null or p_cancelled is null or
    (p_cancelled and (p_provider_message_id is not null or p_error is not null)) or
    (not p_cancelled and ((p_provider_message_id is null)=(p_error is null))) then
    raise exception 'Invalid delivery result' using errcode='22023';
  end if;
  update public.crew_prize_share_emails
  set status=case when p_cancelled then 'cancelled' when p_provider_message_id is not null then 'sent' else 'failed' end,
      provider_message_id=p_provider_message_id,last_error=left(p_error,500),
      sent_at=case when p_provider_message_id is not null then now() else null end,updated_at=now()
  where id=p_id and status='processing';
  if not found then raise exception 'Share email was not processing' using errcode='P0001'; end if;
end;
$$;
revoke all on function public.finish_crew_prize_share_email(uuid,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.finish_crew_prize_share_email(uuid,text,text,boolean) to service_role;

create function demo_private.invoke_crew_prize_share_email_worker() returns void
language plpgsql security definer set search_path='' as $$
declare v_token text; v_anon_jwt text;
begin
  if not coalesce((select enabled from demo_private.crew_prize_share_email_worker_config where singleton),false) then return; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='crew_prize_share_email_worker_token';
  select decrypted_secret into v_anon_jwt from vault.decrypted_secrets where name='outcome_email_worker_anon_jwt';
  if v_token is null or v_anon_jwt is null then raise warning 'Crew share email worker secrets are missing'; return; end if;
  perform net.http_post(
    url:='https://ocgdfnvvjvutevgqzzgj.supabase.co/functions/v1/send-crew-prize-shares',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_jwt,
      'X-Crew-Prize-Share-Worker-Token',v_token),body:='{}'::jsonb,timeout_milliseconds:=10000
  );
end;
$$;
revoke all on function demo_private.invoke_crew_prize_share_email_worker() from public,anon,authenticated,service_role;
select cron.schedule('zero-loss-crew-prize-share-email-worker','* * * * *',
  'select demo_private.invoke_crew_prize_share_email_worker();');

notify pgrst,'reload schema';
commit;
