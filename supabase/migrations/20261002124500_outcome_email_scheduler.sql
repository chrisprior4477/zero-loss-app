-- Persistent, single-purpose outcome-email polling. The schedule is installed
-- but inert until an operator explicitly enables both this database switch and
-- OUTCOME_EMAIL_DELIVERY_ENABLED in the Edge Function. Never store a service-role
-- key in Vault for this job.
begin;

create extension if not exists pg_net with schema extensions;

create table demo_private.outcome_email_worker_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table demo_private.outcome_email_worker_config enable row level security;
revoke all on demo_private.outcome_email_worker_config from public, anon, authenticated, service_role;
insert into demo_private.outcome_email_worker_config (singleton, enabled) values (true, false);

create function demo_private.invoke_outcome_email_worker() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_enabled boolean;
  v_token text;
  v_anon_jwt text;
begin
  select enabled into v_enabled
  from demo_private.outcome_email_worker_config where singleton = true;
  if not coalesce(v_enabled, false) then return; end if;

  select decrypted_secret into v_token from vault.decrypted_secrets
  where name = 'outcome_email_worker_token';
  select decrypted_secret into v_anon_jwt from vault.decrypted_secrets
  where name = 'outcome_email_worker_anon_jwt';
  if v_token is null or v_anon_jwt is null then
    raise warning 'Outcome email worker secrets are missing';
    return;
  end if;

  perform net.http_post(
    url := 'https://ocgdfnvvjvutevgqzzgj.supabase.co/functions/v1/send-outcome-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_jwt,
      'X-Outcome-Worker-Token', v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;
revoke all on function demo_private.invoke_outcome_email_worker() from public, anon, authenticated, service_role;

select cron.schedule(
  'zero-loss-outcome-email-worker',
  '* * * * *',
  'select demo_private.invoke_outcome_email_worker();'
);

commit;
