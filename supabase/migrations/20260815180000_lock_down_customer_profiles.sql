-- Lock down writes to public.customer_profiles.
--
-- Before this migration, authenticated clients held a table-wide UPDATE grant
-- plus a self-scoped UPDATE policy. A customer could therefore rewrite every
-- column of their own row straight through the Data API: not just the display
-- preferences, but legal_first_name, legal_last_name and date_of_birth (the KYC
-- identity fields), customer_id (the FK to public.customers), created_at, and
-- record_version.
--
-- After this migration:
--   * authenticated has no UPDATE grant and no UPDATE policy on the table;
--   * the four preference fields are writable only through
--     public.update_customer_profile_preferences(jsonb), a SECURITY DEFINER RPC
--     scoped to the caller's own row;
--   * legal_first_name, legal_last_name and date_of_birth have no
--     client-writable path at all — they stay server-side only, changeable by
--     the table owner or a SECURITY DEFINER routine;
--   * id, customer_profile_id, customer_id and created_at are immutable for
--     every writer, and record_version advances on every UPDATE — enforced by a
--     trigger rather than by convention, so it holds for server-side writes too.
--     customer_profile_id is included because cpf_... is a canonical external
--     identifier; nothing should ever renumber an existing profile.
--
-- Both current read sites (src/app/account/page.tsx and
-- src/components/layout/SiteHeader.tsx) only SELECT, so nothing in the app
-- depends on the UPDATE grant being removed.

-- 1. Remove the blanket client write path.

drop policy if exists "Customer profiles can update own record"
  on public.customer_profiles;

revoke update on public.customer_profiles from authenticated;

-- 2. Immutable columns and automatic record_version.
--
-- This fires for every UPDATE regardless of role, including the RPC below and
-- any future server-side write, so the invariants cannot be bypassed by
-- reaching around the RPC. search_path is pinned empty: the body touches no
-- schema-qualified objects, and operators still resolve from pg_catalog.

create or replace function public.enforce_customer_profiles_write_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'customer_profiles.id is immutable'
      using errcode = '23514';
  end if;

  if new.customer_id is distinct from old.customer_id then
    raise exception 'customer_profiles.customer_id is immutable'
      using errcode = '23514';
  end if;

  if new.customer_profile_id is distinct from old.customer_profile_id then
    raise exception 'customer_profiles.customer_profile_id is immutable'
      using errcode = '23514';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'customer_profiles.created_at is immutable'
      using errcode = '23514';
  end if;

  new.record_version := old.record_version + 1;

  return new;
end;
$$;

-- Fires before customer_profiles_set_updated_at (BEFORE triggers run in name
-- order); the two touch disjoint columns, so the order is not load-bearing.
create trigger customer_profiles_enforce_write_rules
  before update on public.customer_profiles
  for each row
  execute function public.enforce_customer_profiles_write_rules();

-- 3. The only client-writable path: the four preference fields.
--
-- Takes a jsonb patch rather than four typed arguments for two reasons: an
-- unrecognised field raises instead of being silently ignored, and a caller can
-- distinguish "leave unchanged" (key absent) from "clear this" (key present,
-- JSON null) — impossible with nullable typed arguments.
--
-- SECURITY DEFINER means the caller does not need an UPDATE grant, so the
-- `where customer_id = caller` clause below is the entire security boundary.
-- Do not loosen it.

create or replace function public.update_customer_profile_preferences(
  p_updates jsonb
)
returns table (
  display_name text,
  preferred_locale text,
  timezone text,
  avatar_reference text,
  record_version integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  rejected text[];
  affected integer;
begin
  if caller is null then
    raise exception 'Not authenticated'
      using errcode = '28000';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then
    raise exception 'p_updates must be a JSON object'
      using errcode = '22023';
  end if;

  if p_updates = '{}'::jsonb then
    raise exception 'No profile fields supplied'
      using errcode = '22023';
  end if;

  select array_agg(k.key order by k.key)
    into rejected
  from jsonb_object_keys(p_updates) as k(key)
  where k.key not in (
    'display_name',
    'preferred_locale',
    'timezone',
    'avatar_reference'
  );

  if rejected is not null then
    raise exception 'Field(s) not writable by this function: %',
      array_to_string(rejected, ', ')
      using errcode = '42501';
  end if;

  select array_agg(e.key order by e.key)
    into rejected
  from jsonb_each(p_updates) as e(key, value)
  where jsonb_typeof(e.value) not in ('string', 'null');

  if rejected is not null then
    raise exception 'Field(s) must be a string or null: %',
      array_to_string(rejected, ', ')
      using errcode = '22023';
  end if;

  return query
  update public.customer_profiles as p
  set
    display_name = case
      when p_updates ? 'display_name'
        then nullif(btrim(p_updates ->> 'display_name'), '')
      else p.display_name
    end,
    preferred_locale = case
      when p_updates ? 'preferred_locale'
        then nullif(btrim(p_updates ->> 'preferred_locale'), '')
      else p.preferred_locale
    end,
    timezone = case
      when p_updates ? 'timezone'
        then nullif(btrim(p_updates ->> 'timezone'), '')
      else p.timezone
    end,
    avatar_reference = case
      when p_updates ? 'avatar_reference'
        then nullif(btrim(p_updates ->> 'avatar_reference'), '')
      else p.avatar_reference
    end
  where p.customer_id = caller
  returning
    p.display_name,
    p.preferred_locale,
    p.timezone,
    p.avatar_reference,
    p.record_version,
    p.updated_at;

  get diagnostics affected = row_count;

  if affected = 0 then
    raise exception 'No customer profile for the current user'
      using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.update_customer_profile_preferences(jsonb) is
  'Updates display_name, preferred_locale, timezone and avatar_reference on the '
  'calling user''s own customer_profiles row. Absent key = leave unchanged, '
  'JSON null or blank string = clear. Any other key is rejected. Legal name and '
  'date of birth are deliberately not reachable here.';

-- Postgres grants EXECUTE to PUBLIC on new functions, which would expose this
-- to anon as well; strip that before granting narrowly.
revoke all on function public.update_customer_profile_preferences(jsonb)
  from public;

grant execute on function public.update_customer_profile_preferences(jsonb)
  to authenticated;
