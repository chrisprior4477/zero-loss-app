-- Device membership owns access to an isolated simulation. Money and entries
-- continue to belong to the existing demo wallet and entry systems.
begin;
create table demo_private.personal_demos (
  subject uuid primary key default gen_random_uuid(),
  code text unique check (code ~ '^[0-9]{4}$'),
  share_hash text unique,
  last_seen timestamptz not null default now()
);
create table demo_private.personal_demo_devices (
  device_hash text primary key check (device_hash ~ '^[0-9a-f]{64}$'),
  home uuid not null references demo_private.personal_demos(subject),
  active uuid not null references demo_private.personal_demos(subject),
  guest boolean not null default false,
  notice jsonb,
  requested uuid references demo_private.personal_demos(subject),
  request_id uuid,
  last_request timestamptz,
  check (not guest or active <> home)
);
create index personal_demo_members on demo_private.personal_demo_devices(active);
create index personal_demo_requests on demo_private.personal_demo_devices(requested,last_request);
create table demo_private.personal_demo_starts (
  bucket text primary key, starts integer not null, since timestamptz not null
);
alter table demo_private.personal_demos enable row level security;
alter table demo_private.personal_demo_devices enable row level security;
alter table demo_private.personal_demo_starts enable row level security;
revoke all on demo_private.personal_demos, demo_private.personal_demo_devices, demo_private.personal_demo_starts from public,anon,authenticated,service_role;

create function demo_private.personal_demo_code(p_subject uuid) returns text
language plpgsql set search_path='' as $$
declare candidate text; start_at integer; reclaimed uuid;
begin
  select code into candidate from demo_private.personal_demos where subject=p_subject;
  if candidate is not null then return candidate; end if;
  start_at := (('x'||left(replace(gen_random_uuid()::text,'-',''),7))::bit(28)::integer % 10000);
  select lpad(((start_at+i)%10000)::text,4,'0') into candidate from generate_series(0,9999) i
    where not exists(select 1 from demo_private.personal_demos r where r.code=lpad(((start_at+i)%10000)::text,4,'0'))
    limit 1;
  if candidate is null then
    select r.subject,r.code into reclaimed,candidate from demo_private.personal_demos r
    where r.code is not null and r.share_hash is null and r.last_seen < now()-interval '7 days'
      and not exists(select 1 from public.ledger_entries e where e.customer_id=r.subject)
      and not exists(select 1 from demo_private.personal_demo_devices d where d.active=r.subject and d.home<>r.subject)
    order by r.last_seen limit 1;
    if reclaimed is null then raise exception 'Demo codes are busy. Try again later.' using errcode='P0001'; end if;
    update demo_private.personal_demos set code=null where subject=reclaimed;
  end if;
  update demo_private.personal_demos set code=candidate,last_seen=now() where subject=p_subject;
  return candidate;
end $$;
revoke all on function demo_private.personal_demo_code(uuid) from public,anon,authenticated,service_role;

create function demo_private.personal_demo_balance(p_subject uuid) returns bigint
language sql stable set search_path='' as $$
 select coalesce(sum(l.amount),0)::bigint from public.wallet_accounts w
 join public.ledger_entries l on l.wallet_account_id=w.id and l.customer_id=w.customer_id
 where w.customer_id=p_subject and w.scope='demo' and w.closed_at is null and l.balance_type='PLAYABLE'
$$;
revoke all on function demo_private.personal_demo_balance(uuid) from public,anon,authenticated,service_role;

create function public.personal_demo_device(p_device text,p_action text,p_value text default '',p_bucket text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare device demo_private.personal_demo_devices; room demo_private.personal_demos;
  target uuid; new_subject uuid; target_code text; request_uuid uuid; pending uuid;
  last_balance bigint; value jsonb:='{}'; attempts integer; guest_count integer;
begin
 if auth.role() is distinct from 'service_role' or p_device !~ '^[0-9a-f]{64}$' or p_device is null or
   not exists(select 1 from demo_private.funding_config where singleton and preview_provisioning_enabled
     and environment='development-test' and preview_issuer='https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1') then
   raise exception 'Demo unavailable' using errcode='42501';
 end if;
 -- Serialize membership transitions (including accept vs. revoke). Polls take
 -- a shared lock and never hold it across Auth or network requests.
 if p_action in ('state','session','inspect') then
   perform pg_advisory_xact_lock_shared(74126935);
 else perform pg_advisory_xact_lock(74126935); end if;
 select * into device from demo_private.personal_demo_devices where device_hash=p_device;
 if not found then
   if p_action <> 'start' then return jsonb_build_object('missing',true); end if;
   if p_bucket is null or p_bucket !~ '^[0-9a-f]{64}$' then raise exception 'Invalid start' using errcode='22023'; end if;
   delete from demo_private.personal_demo_starts where since<now()-interval '1 hour';
   insert into demo_private.personal_demo_starts values (p_bucket,1,now())
     on conflict(bucket) do update set starts=demo_private.personal_demo_starts.starts+1 returning starts into attempts;
   if attempts>80 then raise exception 'Too many new devices. Try again later.' using errcode='P0001'; end if;
   insert into demo_private.personal_demos default values returning subject into new_subject;
   perform demo_private.personal_demo_code(new_subject);
   insert into demo_private.personal_demo_devices(device_hash,home,active) values (p_device,new_subject,new_subject) returning * into device;
 end if;
 select * into strict room from demo_private.personal_demos where subject=device.active;
 if room.code is null then
   if p_action<>'start' then return jsonb_build_object('missing',true); end if;
   room.code:=demo_private.personal_demo_code(room.subject);
 end if;
 if p_action='session' then return jsonb_build_object('subject',room.subject); end if;
 if p_action='share' then
   if device.guest or p_value !~ '^[0-9a-f]{64}$' then raise exception 'Sharing unavailable' using errcode='42501'; end if;
   -- The server derives a stable share token from this random generation.
   update demo_private.personal_demos set share_hash=coalesce(share_hash,p_value) where subject=room.subject returning * into room;
 elsif p_action in ('inspect','join') then
   select subject,code into target,target_code from demo_private.personal_demos where share_hash=p_value;
   if target is null then raise exception 'This sharing link has ended.' using errcode='P0001'; end if;
   value:=jsonb_build_object('sharedCode',target_code);
   if p_action='join' and target<>device.active then
     update demo_private.personal_demo_devices set active=target,guest=(home<>target),notice=null,requested=null,request_id=null where device_hash=p_device;
   end if;
 elsif p_action='leave' then
   if device.guest then
     perform demo_private.personal_demo_code(device.home);
     update demo_private.personal_demo_devices set active=home,guest=false,requested=null,request_id=null,notice=null where device_hash=p_device;
   end if;
 elsif p_action='revoke' then
   if device.guest then raise exception 'Only the demo owner can end sharing.' using errcode='42501'; end if;
   last_balance:=demo_private.personal_demo_balance(room.subject);
   update demo_private.personal_demos set share_hash=null where subject=room.subject;
   for target in select home from demo_private.personal_demo_devices where active=room.subject and guest loop
     perform demo_private.personal_demo_code(target);
   end loop;
   update demo_private.personal_demo_devices set active=home,guest=false,requested=null,request_id=null,
     notice=jsonb_build_object('kind','ended','code',room.code,'balance',last_balance)
     where active=room.subject and guest;
 elsif p_action='request' then
   if device.guest or p_value !~ '^[0-9]{4}$' then raise exception 'Enter the four digits from your phone.' using errcode='P0001'; end if;
   if device.last_request>now()-interval '20 seconds' then raise exception 'Wait a moment before trying another code.' using errcode='P0001'; end if;
   select subject into target from demo_private.personal_demos where code=p_value;
   if target=device.active then raise exception 'This device already uses that demo.' using errcode='P0001'; end if;
   -- Unknown codes receive the same expiring waiting state as known codes.
   update demo_private.personal_demo_devices set requested=target,request_id=gen_random_uuid(),last_request=now(),notice=null where device_hash=p_device;
 elsif p_action in ('allow','deny') then
   if device.guest then raise exception 'Owner approval required.' using errcode='42501'; end if;
   select request_id into request_uuid from demo_private.personal_demo_devices where requested=room.subject and request_id::text=p_value
    and last_request>now()-interval '2 minutes';
   if request_uuid is null then raise exception 'This request expired.' using errcode='P0001'; end if;
   update demo_private.personal_demo_devices set active=case when p_action='allow' then room.subject else active end,
     guest=false,request_id=null,requested=null,notice=jsonb_build_object('kind',case when p_action='allow' then 'connected' else 'declined' end)
     where request_id=request_uuid;
 elsif p_action='cancel' then
   update demo_private.personal_demo_devices set requested=null,request_id=null where device_hash=p_device;
 elsif p_action='ack' then
   update demo_private.personal_demo_devices set notice=null where device_hash=p_device;
 elsif p_action not in ('state','start','session') then raise exception 'Unknown demo action' using errcode='22023';
 end if;
 select * into strict device from demo_private.personal_demo_devices where device_hash=p_device;
 select * into strict room from demo_private.personal_demos where subject=device.active;
 if room.last_seen<now()-interval '1 day' then update demo_private.personal_demos set last_seen=now() where subject=room.subject; end if;
 if not device.guest then
  select request_id into pending from demo_private.personal_demo_devices where requested=room.subject and last_request>now()-interval '2 minutes'
   order by last_request limit 1;
 end if;
 select count(*) into guest_count from demo_private.personal_demo_devices where active=room.subject and guest;
 return value || jsonb_build_object('subject',room.subject,'code',room.code,'guest',device.guest,'guests',guest_count,
   'sharing',room.share_hash is not null,'generation',case when p_action='share' then room.share_hash end,
   'paired',exists(select 1 from demo_private.personal_demo_devices where active=room.subject and not guest and device_hash<>p_device),
   'waiting',device.request_id is not null and device.last_request>now()-interval '2 minutes','pending',pending,
   'notice',device.notice,'balance',demo_private.personal_demo_balance(room.subject),
   'revision',(select max(l.created_at) from public.ledger_entries l where l.customer_id=room.subject and l.wallet_scope='demo'));
end $$;
revoke all on function public.personal_demo_device(text,text,text,text) from public,anon,authenticated;
grant execute on function public.personal_demo_device(text,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
