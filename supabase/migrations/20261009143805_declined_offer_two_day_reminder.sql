-- One explicit email reminder for a customer-owned declined demo option.
-- Keep it in the canonical completion-option outbox, separate from the
-- standard reminders that declining an option cancels.
begin;

alter table public.completion_option_reminders
  drop constraint completion_option_reminders_reminder_key_check;
alter table public.completion_option_reminders
  add constraint completion_option_reminders_reminder_key_check
  check (reminder_key in ('available','21d','14d','7d','3d','24h','6h','1h','declined_2d'));

create function public.set_declined_offer_email_reminder(p_completion_option_id uuid, p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_option public.completion_options; v_status text;
begin
  if v_uid is null or p_completion_option_id is null or p_enabled is null then
    raise exception 'Invalid reminder request' using errcode = '22023'; end if;
  if not coalesce((select preview_entries_enabled and environment = 'development-test'
      and preview_issuer = auth.jwt()->>'iss' from demo_private.funding_config where singleton), false) then
    raise exception 'Demo reminder unavailable' using errcode = '42501'; end if;
  select * into v_option from public.completion_options
    where id = p_completion_option_id and customer_id = v_uid
      and wallet_account_id = public.current_wallet_account_id() for update;
  if not found or demo_private.option_status(v_option.id) <> 'declined'
      or exists (select 1 from public.demo_entry_reset_items r where r.customer_entry_id = v_option.customer_entry_id) then
    raise exception 'Declined offer unavailable' using errcode = '42501'; end if;
  if p_enabled then
    if not coalesce((select enabled from demo_private.declined_reminder_worker_config where singleton),false) then
      raise exception 'Email reminder delivery is unavailable' using errcode = 'P0001'; end if;
    if not exists (select 1 from auth.users where id = v_uid and email_confirmed_at is not null) then
      raise exception 'Confirmed email required' using errcode = '42501'; end if;
    if v_option.expires_at <= now() + interval '2 days' then
      raise exception 'This offer is too close to its deadline for a two-day reminder' using errcode = 'P0001'; end if;
    select status into v_status from public.completion_option_reminders
      where completion_option_id = v_option.id and reminder_key = 'declined_2d' for update;
    if v_status = 'sent' then return jsonb_build_object('status','sent'); end if;
    insert into public.completion_option_reminders
      (completion_option_id, customer_id, reminder_key, scheduled_for, status)
      values (v_option.id, v_uid, 'declined_2d', v_option.expires_at - interval '2 days', 'pending')
      on conflict (completion_option_id, reminder_key) do update
      set status = 'pending', scheduled_for = excluded.scheduled_for,
          last_error = null, updated_at = now()
      where public.completion_option_reminders.status in ('cancelled','failed');
    return jsonb_build_object('status','pending');
  end if;
  update public.completion_option_reminders set status = 'cancelled', updated_at = now()
    where completion_option_id = v_option.id and reminder_key = 'declined_2d'
      and status in ('pending','processing');
  return jsonb_build_object('status','cancelled');
end;
$$;
revoke all on function public.set_declined_offer_email_reminder(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_declined_offer_email_reminder(uuid,boolean) to authenticated;

create table demo_private.declined_reminder_worker_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table demo_private.declined_reminder_worker_config enable row level security;
revoke all on demo_private.declined_reminder_worker_config from public,anon,authenticated,service_role;
insert into demo_private.declined_reminder_worker_config(singleton,enabled) values(true,false);

create function public.get_declined_offer_reminder_delivery_enabled()
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return coalesce((select enabled from demo_private.declined_reminder_worker_config where singleton),false);
end;
$$;
revoke all on function public.get_declined_offer_reminder_delivery_enabled() from public,anon,authenticated,service_role;
grant execute on function public.get_declined_offer_reminder_delivery_enabled() to authenticated;

-- Revival restores the ordinary option reminders. It must not restore a
-- declined-only reminder, even if the customer declines again later.
create function demo_private.keep_declined_reminder_declined()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.reminder_key = 'declined_2d' and new.status = 'pending'
    and demo_private.option_status(new.completion_option_id) <> 'declined' then
    new.status := 'cancelled';
  end if;
  return new;
end;
$$;
revoke all on function demo_private.keep_declined_reminder_declined() from public,anon,authenticated,service_role;
create trigger keep_declined_reminder_declined before update of status on public.completion_option_reminders
  for each row execute function demo_private.keep_declined_reminder_declined();

create function public.claim_declined_offer_email_reminders(p_limit integer default 10)
returns setof public.completion_option_reminders
language plpgsql security definer set search_path = '' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then
    raise exception 'Invalid batch size' using errcode = '22023'; end if;
  return query with candidates as (
    select r.id from public.completion_option_reminders r
    where r.reminder_key = 'declined_2d' and r.status = 'pending' and r.scheduled_for <= now()
    order by r.scheduled_for, r.id limit p_limit for update skip locked
  )
  update public.completion_option_reminders r
    set status = 'processing', attempt_count = r.attempt_count + 1, updated_at = now()
    from candidates c where r.id = c.id returning r.*;
end;
$$;
revoke all on function public.claim_declined_offer_email_reminders(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_declined_offer_email_reminders(integer) to service_role;

create function public.get_declined_offer_email_payload(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'customerId', r.customer_id,
    'title', f.title,
    'retailer', f.retailer,
    'deadline', o.expires_at,
    'eligible', r.status = 'processing' and r.reminder_key = 'declined_2d'
      and o.expires_at > now() and demo_private.option_status(o.id) = 'declined'
      and not exists (select 1 from public.demo_entry_reset_items x where x.customer_entry_id = o.customer_entry_id)
  )
  from public.completion_option_reminders r
  join public.completion_options o on o.id = r.completion_option_id and o.customer_id = r.customer_id
  join public.customer_entries e on e.id = o.customer_entry_id and e.customer_id = r.customer_id
  join demo_private.preview_entry_offerings f on f.slug = e.offering_slug
  where r.id = p_id and r.reminder_key = 'declined_2d' and r.status = 'processing';
$$;
revoke all on function public.get_declined_offer_email_payload(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_declined_offer_email_payload(uuid) to service_role;

create function public.finish_declined_offer_email_reminder(
  p_id uuid, p_provider_message_id text, p_error text, p_cancelled boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_id is null or p_cancelled is null or
    (not p_cancelled and ((p_provider_message_id is null) = (p_error is null))) or
    (p_cancelled and (p_provider_message_id is not null or p_error is not null)) then
    raise exception 'Invalid delivery result' using errcode = '22023'; end if;
  update public.completion_option_reminders
    set status = case when p_cancelled then 'cancelled'
      when p_provider_message_id is not null then 'sent' else 'failed' end,
      provider_message_id = p_provider_message_id,
      last_error = left(p_error,500),
      sent_at = case when p_provider_message_id is not null then now() else null end,
      updated_at = now()
    where id = p_id and reminder_key = 'declined_2d' and status = 'processing';
  if not found then raise exception 'Delivery was not processing' using errcode = 'P0001'; end if;
end;
$$;
revoke all on function public.finish_declined_offer_email_reminder(uuid,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.finish_declined_offer_email_reminder(uuid,text,text,boolean) to service_role;

-- Independent switch and schedule: do not turn on all pending outcome mail.
create function demo_private.invoke_declined_offer_reminder_worker()
returns void language plpgsql security definer set search_path = '' as $$
declare v_token text; v_anon_jwt text;
begin
  if not coalesce((select enabled from demo_private.declined_reminder_worker_config where singleton),false) then return; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'outcome_email_worker_token';
  select decrypted_secret into v_anon_jwt from vault.decrypted_secrets where name = 'outcome_email_worker_anon_jwt';
  if v_token is null or v_anon_jwt is null then
    raise warning 'Declined reminder worker credentials are missing'; return; end if;
  perform net.http_post(
    url := 'https://ocgdfnvvjvutevgqzzgj.supabase.co/functions/v1/send-outcome-emails?mode=declined-reminders',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer ' || v_anon_jwt, 'X-Outcome-Worker-Token',v_token),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;
revoke all on function demo_private.invoke_declined_offer_reminder_worker() from public,anon,authenticated,service_role;
select cron.schedule('zero-loss-declined-offer-reminder-worker','* * * * *',
  'select demo_private.invoke_declined_offer_reminder_worker();');

notify pgrst, 'reload schema';
commit;
