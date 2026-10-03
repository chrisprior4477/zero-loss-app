-- Optional, one-time email when a saved offer is at least 90% full.
-- No existing favorite is opted in by this migration.
begin;

alter table public.customer_favorites
  add column email_almost_full_enabled boolean not null default false;
alter table public.customer_communication_preferences
  add column favorite_alert_email_enabled boolean not null default true;

create function public.set_favorite_capacity_alert(p_slug text, p_enabled boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_slug is null or length(p_slug) > 120 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or p_enabled is null then
    raise exception 'Invalid alert choice' using errcode = '22023';
  end if;
  update public.customer_favorites
    set email_almost_full_enabled = p_enabled
    where customer_id = auth.uid() and product_slug = p_slug;
  if not found then raise exception 'Save this item before enabling its alert' using errcode = '22023'; end if;
  return p_enabled;
end;
$$;
revoke all on function public.set_favorite_capacity_alert(text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_favorite_capacity_alert(text,boolean) to authenticated;

create function public.get_favorite_alert_email_enabled() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return coalesce((select favorite_alert_email_enabled from public.customer_communication_preferences
    where customer_id = auth.uid()), true);
end;
$$;
revoke all on function public.get_favorite_alert_email_enabled() from public,anon,authenticated,service_role;
grant execute on function public.get_favorite_alert_email_enabled() to authenticated;

create function public.set_favorite_alert_email_enabled(p_enabled boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_enabled is null then raise exception 'Email preference is required' using errcode = '22023'; end if;
  insert into public.customer_communication_preferences(customer_id,favorite_alert_email_enabled,updated_at)
    values(auth.uid(),p_enabled,now())
    on conflict(customer_id) do update set favorite_alert_email_enabled=excluded.favorite_alert_email_enabled,updated_at=now();
  return p_enabled;
end;
$$;
revoke all on function public.set_favorite_alert_email_enabled(boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_favorite_alert_email_enabled(boolean) to authenticated;

create table public.favorite_capacity_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  product_slug text not null references demo_private.preview_entry_offerings(slug) on delete restrict,
  status text not null default 'pending' check(status in ('pending','processing','sent','failed','cancelled')),
  scheduled_for timestamptz not null default now(),
  attempt_count integer not null default 0 check(attempt_count >= 0),
  provider_message_id text,
  last_error text check(last_error is null or length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(customer_id,product_slug),
  check((status='sent')=(sent_at is not null))
);
create index favorite_capacity_alert_due on public.favorite_capacity_alert_deliveries(scheduled_for,id) where status='pending';
alter table public.favorite_capacity_alert_deliveries enable row level security;
revoke all on public.favorite_capacity_alert_deliveries from public,anon,authenticated,service_role;
grant select,update on public.favorite_capacity_alert_deliveries to service_role;

-- Counts use the same preserved sample capacity plus confirmed customer tickets.
-- Queue only while the offer is active and has tickets left. A unique key makes
-- polling and retries incapable of queuing another alert for the same saved item.
create function demo_private.queue_favorite_capacity_alerts() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  with eligible as (
    select f.customer_id,f.product_slug
    from public.customer_favorites f
    join demo_private.preview_entry_offerings o on o.slug=f.product_slug and o.active
    left join public.customer_communication_preferences p on p.customer_id=f.customer_id
    cross join lateral (select count(*)::bigint as real_entries from public.customer_entries e where e.offering_slug=o.slug) entries
    where f.email_almost_full_enabled
      and coalesce(p.favorite_alert_email_enabled,true)
      and not exists(select 1 from demo_private.preview_offer_closures c where c.offering_slug=o.slug)
      and o.sample_entries::bigint + case when o.repeatable_scenario then 0 else entries.real_entries end < o.capacity
      and 10 * (o.sample_entries::bigint + case when o.repeatable_scenario then 0 else entries.real_entries end) >= 9 * o.capacity
  )
  insert into public.favorite_capacity_alert_deliveries(customer_id,product_slug)
    select customer_id,product_slug from eligible
    on conflict(customer_id,product_slug) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function demo_private.queue_favorite_capacity_alerts() from public,anon,authenticated,service_role;

create function public.claim_favorite_capacity_alerts(p_limit integer default 10)
returns setof public.favorite_capacity_alert_deliveries
language plpgsql security definer set search_path = '' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  return query with candidates as (
    select d.id from public.favorite_capacity_alert_deliveries d
    where d.status='pending' and d.scheduled_for<=now()
    order by d.scheduled_for,d.id limit p_limit for update skip locked
  )
  update public.favorite_capacity_alert_deliveries d
    set status='processing',attempt_count=d.attempt_count+1,updated_at=now()
    from candidates c where d.id=c.id returning d.*;
end;
$$;
revoke all on function public.claim_favorite_capacity_alerts(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_favorite_capacity_alerts(integer) to service_role;

create function public.get_favorite_capacity_alert_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'customerId',d.customer_id,'slug',d.product_slug,'title',o.title,
    'capacity',o.capacity,'sold',least(o.capacity,o.sample_entries::bigint + case when o.repeatable_scenario then 0 else entries.real_entries end),
    'eligible',f.email_almost_full_enabled and coalesce(p.favorite_alert_email_enabled,true)
      and o.active and c.offering_slug is null
      and o.sample_entries::bigint + case when o.repeatable_scenario then 0 else entries.real_entries end < o.capacity
      and 10 * (o.sample_entries::bigint + case when o.repeatable_scenario then 0 else entries.real_entries end) >= 9 * o.capacity
  )
  from public.favorite_capacity_alert_deliveries d
  join demo_private.preview_entry_offerings o on o.slug=d.product_slug
  left join public.customer_favorites f on f.customer_id=d.customer_id and f.product_slug=d.product_slug
  left join public.customer_communication_preferences p on p.customer_id=d.customer_id
  left join demo_private.preview_offer_closures c on c.offering_slug=d.product_slug
  cross join lateral (select count(*)::bigint as real_entries from public.customer_entries e where e.offering_slug=o.slug) entries
  where d.id=p_id and d.status='processing';
$$;
revoke all on function public.get_favorite_capacity_alert_payload(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_favorite_capacity_alert_payload(uuid) to service_role;

create function public.finish_favorite_capacity_alert(p_id uuid,p_provider_message_id text,p_error text,p_cancelled boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_id is null or (not p_cancelled and ((p_provider_message_id is null) = (p_error is null)))
    or (p_cancelled and (p_provider_message_id is not null or p_error is not null)) then
    raise exception 'Invalid delivery result' using errcode='22023';
  end if;
  update public.favorite_capacity_alert_deliveries
    set status=case when p_cancelled then 'cancelled' when p_provider_message_id is not null then 'sent' else 'failed' end,
      provider_message_id=p_provider_message_id,last_error=left(p_error,500),
      sent_at=case when p_provider_message_id is not null then now() else null end,updated_at=now()
    where id=p_id and status='processing';
  if not found then raise exception 'Delivery was not processing' using errcode='P0001'; end if;
end;
$$;
revoke all on function public.finish_favorite_capacity_alert(uuid,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.finish_favorite_capacity_alert(uuid,text,text,boolean) to service_role;

-- Cron queues alerts but does not send mail until the separately secured
-- Edge worker is configured and enabled by an operator.
select cron.schedule('zero-loss-queue-favorite-capacity-alerts','* * * * *','select demo_private.queue_favorite_capacity_alerts();');

create table demo_private.favorite_capacity_alert_worker_config (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table demo_private.favorite_capacity_alert_worker_config enable row level security;
revoke all on demo_private.favorite_capacity_alert_worker_config from public,anon,authenticated,service_role;
insert into demo_private.favorite_capacity_alert_worker_config(singleton,enabled) values(true,false);

create function demo_private.invoke_favorite_capacity_alert_worker() returns void
language plpgsql security definer set search_path = '' as $$
declare v_token text; v_anon_jwt text;
begin
  if not coalesce((select enabled from demo_private.favorite_capacity_alert_worker_config where singleton),false) then return; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='favorite_capacity_alert_worker_token';
  select decrypted_secret into v_anon_jwt from vault.decrypted_secrets where name='outcome_email_worker_anon_jwt';
  if v_token is null or v_anon_jwt is null then raise warning 'Favorite alert worker secrets are missing'; return; end if;
  perform net.http_post(
    url:='https://ocgdfnvvjvutevgqzzgj.supabase.co/functions/v1/send-favorite-alerts',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_jwt,'X-Favorite-Alert-Worker-Token',v_token),
    body:='{}'::jsonb,timeout_milliseconds:=10000
  );
end;
$$;
revoke all on function demo_private.invoke_favorite_capacity_alert_worker() from public,anon,authenticated,service_role;
select cron.schedule('zero-loss-favorite-alert-worker','* * * * *','select demo_private.invoke_favorite_capacity_alert_worker();');

notify pgrst,'reload schema';
commit;
