begin;

-- A change token tells other devices when to fetch their normal account pages.
-- It never stores an alternative balance, ticket or order.
alter table demo_private.personal_demos add column activity_revision text;
create function demo_private.mark_personal_demo_changed()
returns trigger language plpgsql security definer set search_path='' as $$
declare who uuid; revision text := pg_current_xact_id()::text;
begin
  if tg_op='DELETE' then who:=old.customer_id; else who:=new.customer_id; end if;
  update demo_private.personal_demos set activity_revision=revision
    where subject=who and activity_revision is distinct from revision;
  return null;
end $$;
revoke all on function demo_private.mark_personal_demo_changed() from public,anon,authenticated,service_role;
do $$
declare source regclass;
begin
  foreach source in array array[
    'public.ledger_entries'::regclass,'public.entry_requests'::regclass,'public.customer_entries'::regclass,
    'public.entry_outcomes'::regclass,'public.completion_options'::regclass,'public.customer_rewards'::regclass,
    'public.customer_orders'::regclass,'public.order_events'::regclass,'public.customer_favorites'::regclass,
    'public.customer_notification_reads'::regclass,'public.customer_communication_preferences'::regclass,
    'public.customer_verifications'::regclass,'demo_private.customer_payment_methods'::regclass
  ] loop
    execute format('create trigger personal_demo_activity_changed after insert or update or delete on %s for each row execute function demo_private.mark_personal_demo_changed()',source);
  end loop;
end $$;

-- Only the most recent view exists. Membership is checked again on each
-- read and write, using the same transaction lock as join/leave/revoke.
create table demo_private.personal_demo_view (
  subject uuid primary key references demo_private.personal_demos(subject),
  sequence bigint not null default 1,
  sender text not null references demo_private.personal_demo_devices(device_hash),
  source uuid not null,
  surface text not null check(surface in ('page','menu','categories','filters','info')),
  destination text not null,
  mark text not null,
  x integer not null,
  y integer not null,
  updated_at timestamptz not null default clock_timestamp()
);
alter table demo_private.personal_demo_view enable row level security;
revoke all on demo_private.personal_demo_view from public,anon,authenticated,service_role;

create function public.personal_demo_live_device(p_device text,p_action text,p_value text default '',p_bucket text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; id uuid; shared boolean; message jsonb; presentation jsonb;
begin
  snapshot:=public.personal_demo_device(p_device,case when p_action='present' then 'state' else p_action end,p_value,p_bucket);
  if snapshot ? 'missing' then return snapshot; end if;
  id:=(snapshot->>'subject')::uuid;
  shared:=(snapshot->>'guest')::boolean or (snapshot->>'paired')::boolean or (snapshot->>'sharing')::boolean;
  if p_action='revoke' and not shared then
    delete from demo_private.personal_demo_view where subject=id;
  end if;
  if p_action='present' then
    message:=p_value::jsonb;
    if not shared or message->>'code' is distinct from snapshot->>'code' then
      raise exception 'This shared demo has ended.' using errcode='P0001';
    end if;
    if not coalesce(length(message->>'url') between 1 and 600 and left(message->>'url',1)='/'
      and left(message->>'url',2)<>'//' and (message->>'mark' ~ '^[a-z0-9]{0,20}$')
      and (message->>'x')::int between 0 and 1000 and (message->>'y')::int between 0 and 1000,false) then
      raise exception 'Invalid shared view' using errcode='22023';
    end if;
    insert into demo_private.personal_demo_view(subject,sender,source,surface,destination,mark,x,y)
      values(id,p_device,(message->>'source')::uuid,message->>'surface',message->>'url',message->>'mark',(message->>'x')::int,(message->>'y')::int)
      on conflict(subject) do update set sequence=demo_private.personal_demo_view.sequence+1,sender=excluded.sender,
        source=excluded.source,surface=excluded.surface,destination=excluded.destination,mark=excluded.mark,x=excluded.x,y=excluded.y,updated_at=clock_timestamp();
  end if;
  if shared then
    select jsonb_build_object('seq',v.sequence,'source',v.source,'surface',v.surface,'url',v.destination,
      'mark',case when v.updated_at>clock_timestamp()-interval '5 seconds' then v.mark else '' end,
      'x',v.x,'y',v.y) into presentation from demo_private.personal_demo_view v
      join demo_private.personal_demo_devices d on d.device_hash=v.sender and d.active=v.subject
      where v.subject=id and v.updated_at>now()-interval '20 minutes';
  end if;
  return snapshot || jsonb_build_object('activityRevision',
    (select activity_revision from demo_private.personal_demos where subject=id),'view',presentation);
end $$;
revoke all on function public.personal_demo_live_device(text,text,text,text) from public,anon,authenticated;
grant execute on function public.personal_demo_live_device(text,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
