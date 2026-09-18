-- Persist the customer's choice to stop showing the extra-entry explainer.
begin;

alter table public.customer_profiles
  add column extra_entry_explainer_acknowledged_at timestamptz;

create function public.acknowledge_extra_entry_explainer()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  acknowledged timestamptz;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  update public.customer_profiles as p
  set extra_entry_explainer_acknowledged_at = coalesce(
    p.extra_entry_explainer_acknowledged_at,
    clock_timestamp()
  )
  where p.customer_id = caller
  returning p.extra_entry_explainer_acknowledged_at into acknowledged;

  if not found then
    raise exception 'No customer profile for the current user' using errcode = 'P0002';
  end if;

  return acknowledged;
end;
$$;

comment on function public.acknowledge_extra_entry_explainer() is
  'Records that the authenticated customer understands independent extra entries. Direct profile writes remain denied.';
revoke all on function public.acknowledge_extra_entry_explainer()
  from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_extra_entry_explainer() to authenticated;

notify pgrst, 'reload schema';
commit;
