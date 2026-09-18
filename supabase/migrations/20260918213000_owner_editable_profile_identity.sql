-- Let an authenticated customer correct their own legal name and birth date
-- through the existing owner-scoped RPC. Direct table writes remain revoked.
begin;

create or replace function public.update_customer_profile_preferences(p_updates jsonb)
returns table (
  display_name text,
  preferred_locale text,
  timezone text,
  avatar_reference text,
  record_version integer,
  updated_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  rejected text[];
  affected integer;
  next_date_of_birth date;
begin
  if caller is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then
    raise exception 'p_updates must be a JSON object' using errcode = '22023';
  end if;
  if p_updates = '{}'::jsonb then raise exception 'No profile fields supplied' using errcode = '22023'; end if;

  select array_agg(k.key order by k.key) into rejected
  from jsonb_object_keys(p_updates) as k(key)
  where k.key not in (
    'display_name','preferred_locale','timezone','avatar_reference','phone_number',
    'address_line_1','address_line_2','city','region','postal_code','country',
    'legal_first_name','legal_last_name','date_of_birth'
  );
  if rejected is not null then
    raise exception 'Field(s) not writable by this function: %',array_to_string(rejected, ', ') using errcode = '42501';
  end if;

  select array_agg(e.key order by e.key) into rejected
  from jsonb_each(p_updates) as e(key,value)
  where jsonb_typeof(e.value) not in ('string','null');
  if rejected is not null then
    raise exception 'Field(s) must be a string or null: %',array_to_string(rejected, ', ') using errcode = '22023';
  end if;

  if p_updates ? 'legal_first_name' and nullif(btrim(p_updates->>'legal_first_name'),'') is null then
    raise exception 'Legal first name is required' using errcode = '22023';
  end if;
  if p_updates ? 'legal_last_name' and nullif(btrim(p_updates->>'legal_last_name'),'') is null then
    raise exception 'Legal last name is required' using errcode = '22023';
  end if;
  if length(coalesce(p_updates->>'legal_first_name','')) > 100 or length(coalesce(p_updates->>'legal_last_name','')) > 100 then
    raise exception 'Legal names must be 100 characters or fewer' using errcode = '22023';
  end if;
  if p_updates ? 'date_of_birth' then
    begin
      next_date_of_birth := nullif(btrim(p_updates->>'date_of_birth'),'')::date;
    exception when others then
      raise exception 'Date of birth must be a valid date' using errcode = '22023';
    end;
    if next_date_of_birth is null then
      raise exception 'Date of birth is required' using errcode = '22023';
    end if;
    if next_date_of_birth > (current_date - interval '18 years')::date then
      raise exception 'Customer must be at least 18 years old' using errcode = '22023';
    end if;
    if next_date_of_birth < (current_date - interval '120 years')::date then
      raise exception 'Date of birth is outside the supported range' using errcode = '22023';
    end if;
  end if;

  return query
  update public.customer_profiles as p set
    display_name = case when p_updates ? 'display_name' then nullif(btrim(p_updates->>'display_name'),'') else p.display_name end,
    preferred_locale = case when p_updates ? 'preferred_locale' then nullif(btrim(p_updates->>'preferred_locale'),'') else p.preferred_locale end,
    timezone = case when p_updates ? 'timezone' then nullif(btrim(p_updates->>'timezone'),'') else p.timezone end,
    avatar_reference = case when p_updates ? 'avatar_reference' then nullif(btrim(p_updates->>'avatar_reference'),'') else p.avatar_reference end,
    phone_number = case when p_updates ? 'phone_number' then nullif(btrim(p_updates->>'phone_number'),'') else p.phone_number end,
    address_line_1 = case when p_updates ? 'address_line_1' then nullif(btrim(p_updates->>'address_line_1'),'') else p.address_line_1 end,
    address_line_2 = case when p_updates ? 'address_line_2' then nullif(btrim(p_updates->>'address_line_2'),'') else p.address_line_2 end,
    city = case when p_updates ? 'city' then nullif(btrim(p_updates->>'city'),'') else p.city end,
    region = case when p_updates ? 'region' then nullif(btrim(p_updates->>'region'),'') else p.region end,
    postal_code = case when p_updates ? 'postal_code' then nullif(btrim(p_updates->>'postal_code'),'') else p.postal_code end,
    country = case when p_updates ? 'country' then nullif(btrim(p_updates->>'country'),'') else p.country end,
    legal_first_name = case when p_updates ? 'legal_first_name' then btrim(p_updates->>'legal_first_name') else p.legal_first_name end,
    legal_last_name = case when p_updates ? 'legal_last_name' then btrim(p_updates->>'legal_last_name') else p.legal_last_name end,
    date_of_birth = case when p_updates ? 'date_of_birth' then next_date_of_birth else p.date_of_birth end
  where p.customer_id = caller
  returning p.display_name,p.preferred_locale,p.timezone,p.avatar_reference,p.record_version,p.updated_at;

  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'No customer profile for the current user' using errcode = 'P0002'; end if;
end $$;

comment on function public.update_customer_profile_preferences(jsonb) is
  'Updates the calling customer profile through an authenticated, owner-scoped path. Legal names and birth date are required and age-validated; direct customer_profiles writes remain denied.';
revoke all on function public.update_customer_profile_preferences(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.update_customer_profile_preferences(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
