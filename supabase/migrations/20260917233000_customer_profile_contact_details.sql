-- Add owner-managed contact and mailing details to the existing protected profile.
begin;

alter table public.customer_profiles
  add column phone_number text,
  add column address_line_1 text,
  add column address_line_2 text,
  add column city text,
  add column region text,
  add column postal_code text,
  add column country text,
  add constraint customer_profiles_phone_length check (phone_number is null or length(phone_number) between 7 and 32),
  add constraint customer_profiles_address_1_length check (address_line_1 is null or length(address_line_1) <= 200),
  add constraint customer_profiles_address_2_length check (address_line_2 is null or length(address_line_2) <= 200),
  add constraint customer_profiles_city_length check (city is null or length(city) <= 100),
  add constraint customer_profiles_region_length check (region is null or length(region) <= 100),
  add constraint customer_profiles_postal_length check (postal_code is null or length(postal_code) <= 24),
  add constraint customer_profiles_country_length check (country is null or length(country) <= 100);

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
    'address_line_1','address_line_2','city','region','postal_code','country'
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
    country = case when p_updates ? 'country' then nullif(btrim(p_updates->>'country'),'') else p.country end
  where p.customer_id = caller
  returning p.display_name,p.preferred_locale,p.timezone,p.avatar_reference,p.record_version,p.updated_at;

  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'No customer profile for the current user' using errcode = 'P0002'; end if;
end $$;

comment on function public.update_customer_profile_preferences(jsonb) is
  'Updates the calling customer profile display, locale, timezone, avatar, phone and mailing-address fields. Legal name and date of birth remain unreachable.';
revoke all on function public.update_customer_profile_preferences(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.update_customer_profile_preferences(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
