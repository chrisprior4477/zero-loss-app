-- Only dated, saved demo entries can establish a daily people rate.
-- Seeded sample tickets have no entry dates and must never be used to infer one.
create function public.get_preview_daily_people_average(p_offering_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_person_days bigint;
begin
  if auth.uid() is null or not coalesce((
    select enabled and preview_entries_enabled and environment = 'development-test'
      and preview_issuer = auth.jwt()->>'iss'
    from demo_private.funding_config where singleton
  ), false) then
    raise exception 'Demo entry activity is unavailable' using errcode = '42501';
  end if;

  if p_offering_slug is null or not exists (
    select 1 from demo_private.preview_entry_offerings where slug = p_offering_slug and active
  ) then
    raise exception 'Unknown preview offering' using errcode = '22023';
  end if;

  select count(*) into v_person_days from (
    select distinct e.customer_id, (e.created_at at time zone 'UTC')::date
    from public.customer_entries e
    where e.offering_slug = p_offering_slug
      and e.created_at >= now() - interval '7 days'
  ) dated_people;

  return jsonb_build_object('days', 7, 'personDays', v_person_days);
end;
$$;

revoke all on function public.get_preview_daily_people_average(text) from public, anon, authenticated, service_role;
grant execute on function public.get_preview_daily_people_average(text) to authenticated;
