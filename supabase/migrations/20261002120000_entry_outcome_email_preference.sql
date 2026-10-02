-- Store one account-wide entry-outcome email choice alongside existing communication preferences.
-- This does not enable delivery; the preview still uses in-app outcome notifications.
alter table public.customer_communication_preferences
  add column if not exists entry_outcome_email_enabled boolean not null default false;

create or replace function public.get_entry_outcome_email_enabled() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  return coalesce((select entry_outcome_email_enabled from public.customer_communication_preferences where customer_id = auth.uid()), false);
end;
$$;
revoke all on function public.get_entry_outcome_email_enabled() from public, anon, authenticated, service_role;
grant execute on function public.get_entry_outcome_email_enabled() to authenticated;

create or replace function public.set_entry_outcome_email_enabled(p_enabled boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_enabled is null then raise exception 'Email preference is required' using errcode = '22023'; end if;
  insert into public.customer_communication_preferences(customer_id, entry_outcome_email_enabled, updated_at)
  values (v_uid, p_enabled, now())
  on conflict (customer_id) do update
    set entry_outcome_email_enabled = excluded.entry_outcome_email_enabled, updated_at = now();
  return p_enabled;
end;
$$;
revoke all on function public.set_entry_outcome_email_enabled(boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_entry_outcome_email_enabled(boolean) to authenticated;
