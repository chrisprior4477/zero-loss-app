-- Regression suite for the customer_profiles write path.
--
-- Run with:  npx supabase test db
--
-- What this guards, and why it is written the way it is:
--
-- The lockdown in 20260815180000 rests on four separate mechanisms (A) — a missing
-- UPDATE grant, an RLS SELECT-only policy, a SECURITY DEFINER RPC whose single
-- `where customer_id = auth.uid()` clause is the entire cross-user boundary,
-- and a BEFORE UPDATE trigger enforcing immutability. A change to any one of
-- them can quietly re-open a write path, so the tests below exercise all four
-- from the outside rather than asserting that the DDL looks right.
--
-- Impersonation is `set local role` PLUS `set local request.jwt.claims`. A bare
-- SET ROLE as the superuser is not sufficient and is actively misleading here:
-- postgres bypasses RLS, so such a test passes regardless of what the policies
-- say. auth.uid() reads the JWT claim GUCs, so without them the RPC sees a null
-- caller and every assertion below would be vacuous. Assertions 21-23, 60 and
-- 61 exist purely to prove the impersonation is live before anything is
-- concluded from it — in particular, that user A can see exactly one profile
-- row when two exist, which is only true if RLS is actually filtering.
-- Those guards are assertions 21-23 (user A) and 59-60 (anon).
--
-- pgtap is created inside the transaction and rolled back with it, so the
-- extension is never installed into a real database.
--
-- Custom temp tables owned by postgres are NOT readable while impersonating
-- (permission denied on the temp schema), so snapshots are taken and compared
-- as postgres; only the attempted operations run as a client role.

begin;

create extension if not exists pgtap;

select plan(71);

-- =====================================================================
-- A. Structure, grants and policies (1-20)
-- =====================================================================

select ok(
  (select relrowsecurity from pg_class where oid = 'public.customer_profiles'::regclass),
  'RLS is enabled on customer_profiles');

select policies_are(
  'public', 'customer_profiles',
  array['Customer profiles can select own record'],
  'customer_profiles has exactly one policy, and it is SELECT-only');

select is_definer(
  'public', 'update_customer_profile_preferences', array['jsonb'],
  'update_customer_profile_preferences is SECURITY DEFINER');

select function_privs_are(
  'public', 'update_customer_profile_preferences', array['jsonb'], 'anon',
  array[]::text[],
  'anon cannot EXECUTE the preferences RPC');

select function_privs_are(
  'public', 'update_customer_profile_preferences', array['jsonb'], 'authenticated',
  array['EXECUTE'],
  'authenticated can EXECUTE the preferences RPC');

-- Exact privilege sets. These fail if anything is ever added, which is the
-- point: a new grant has to be deliberate.
select table_privs_are('public', 'customer_profiles', 'authenticated', array['SELECT'],
  'authenticated holds only SELECT on customer_profiles');
select table_privs_are('public', 'customer_profiles', 'anon', array[]::text[],
  'anon holds nothing on customer_profiles');
select table_privs_are('public', 'customers', 'authenticated', array['SELECT'],
  'authenticated holds only SELECT on customers');
select table_privs_are('public', 'customers', 'anon', array[]::text[],
  'anon holds nothing on customers');
select table_privs_are('public', 'catalog_items', 'authenticated', array['SELECT'],
  'authenticated holds only SELECT on catalog_items');
select table_privs_are('public', 'catalog_items', 'anon', array['SELECT'],
  'anon holds only SELECT on catalog_items');
select table_privs_are('public', 'ledger_entries', 'authenticated', array[]::text[],
  'authenticated holds no table-level privilege on ledger_entries (column-level only)');
select table_privs_are('public', 'ledger_entries', 'anon', array[]::text[],
  'anon holds nothing on ledger_entries');
select table_privs_are('public', 'health_check', 'authenticated', array[]::text[],
  'authenticated holds nothing on health_check');
select table_privs_are('public', 'health_check', 'anon', array[]::text[],
  'anon holds nothing on health_check');

-- MAINTAIN is invisible to information_schema, and therefore to
-- table_privs_are above. It has to be checked directly or it will be missed.
select ok(
  not exists (
    select 1
    from unnest(array['anon','authenticated']) as r(rolename),
         unnest(array['customers','customer_profiles','catalog_items',
                      'ledger_entries','health_check']) as t(tbl)
    where has_table_privilege(r.rolename, 'public.' || t.tbl, 'MAINTAIN')
  ),
  'no client role holds MAINTAIN on any public table');

select ok(
  not exists (
    select 1
    from unnest(array['anon','authenticated']) as r(rolename),
         unnest(array['customers','customer_profiles','catalog_items',
                      'ledger_entries','health_check']) as t(tbl),
         unnest(array['TRUNCATE','TRIGGER','REFERENCES']) as p(priv)
    where has_table_privilege(r.rolename, 'public.' || t.tbl, p.priv)
  ),
  'no client role holds TRUNCATE, TRIGGER or REFERENCES on any public table');

select ok(
  not exists (
    select 1
    from pg_class c,
         unnest(array['anon','authenticated']) as r(rolename),
         unnest(array['USAGE','SELECT','UPDATE']) as p(priv)
    where c.relkind = 'S' and c.relnamespace = 'public'::regnamespace
      and has_sequence_privilege(r.rolename, c.oid, p.priv)
  ),
  'no client role holds any privilege on a sequence in public');

-- The default privileges themselves, so a future CREATE TABLE cannot re-open
-- the gap that 20260817120000 closed.
select ok(
  not exists (
    select 1
    from pg_default_acl d, unnest(d.defaclacl) as acl
    where pg_get_userbyid(d.defaclrole) = 'postgres'
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype in ('r', 'S')
      and split_part(acl::text, '=', 1) in ('anon', 'authenticated')
  ),
  'default privileges grant the client roles nothing on future tables or sequences');

-- Guards the column-level restriction from 20260815170000.
select is(
  (select count(*)::int from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'ledger_entries'
      and grantee = 'authenticated' and privilege_type = 'SELECT'),
  12,
  'authenticated can SELECT exactly 12 columns of ledger_entries (fraud columns excluded)');

-- =====================================================================
-- Seed two users. on_auth_user_created builds the customers and
-- customer_profiles rows from raw_user_meta_data.
-- =====================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'rpctest-a@example.test',
   '$2a$10$placeholder.not.a.real.hash.value.unused', now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"legal_first_name":"Ada","legal_last_name":"Lovelace","date_of_birth":"1815-12-10"}'::jsonb,
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'rpctest-b@example.test',
   '$2a$10$placeholder.not.a.real.hash.value.unused', now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"legal_first_name":"Grace","legal_last_name":"Hopper","date_of_birth":"1906-12-09"}'::jsonb,
   now(), now(), '', '', '', '');

-- Snapshot of B's row, taken and later compared as postgres.
create temporary table zl_snap_b as
select to_jsonb(p) as row_json
from public.customer_profiles p
where p.customer_id = '22222222-2222-4222-8222-222222222222'::uuid;

-- =====================================================================
-- B. Positive path as user A (21-39)
-- =====================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aud":"authenticated"}';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select is(current_user::text, 'authenticated', 'impersonation: current_user is authenticated');
select is(auth.uid(), '11111111-1111-4111-8111-111111111111'::uuid,
  'impersonation: auth.uid() resolves to user A');
select is((select count(*)::int from public.customer_profiles), 1,
  'RLS is filtering: A sees 1 of the 2 profile rows');

select lives_ok(
  $q$ select * from public.update_customer_profile_preferences(
        '{"display_name":"  Ada L.  ","preferred_locale":"en-GB",
          "timezone":"Europe/London","avatar_reference":"avatars/ada.png"}'::jsonb) $q$,
  'RPC accepts a patch of all four allowed fields');

select is((select display_name     from public.customer_profiles), 'Ada L.',
  'display_name applied and btrim-ed');
select is((select preferred_locale from public.customer_profiles), 'en-GB',
  'preferred_locale applied');
select is((select timezone         from public.customer_profiles), 'Europe/London',
  'timezone applied');
select is((select avatar_reference from public.customer_profiles), 'avatars/ada.png',
  'avatar_reference applied');
select is((select record_version   from public.customer_profiles), 2,
  'record_version advanced to 2 by the trigger');

select lives_ok(
  $q$ select * from public.update_customer_profile_preferences('{"display_name":"Ada Lovelace"}'::jsonb) $q$,
  'RPC accepts a single-key patch');

select is((select display_name   from public.customer_profiles), 'Ada Lovelace',
  'single-key patch applied');
select is((select timezone       from public.customer_profiles), 'Europe/London',
  'absent key left unchanged');
select is((select record_version from public.customer_profiles), 3,
  'record_version advanced to 3');

select lives_ok(
  $q$ select * from public.update_customer_profile_preferences('{"avatar_reference":null}'::jsonb) $q$,
  'RPC accepts JSON null');

select is((select avatar_reference from public.customer_profiles), null::text,
  'JSON null cleared avatar_reference');
select is((select record_version   from public.customer_profiles), 4,
  'record_version advanced to 4');

select is((select legal_first_name from public.customer_profiles), 'Ada',
  'legal_first_name untouched by the positive path');
select is((select legal_last_name  from public.customer_profiles), 'Lovelace',
  'legal_last_name untouched by the positive path');
select is((select date_of_birth    from public.customer_profiles), '1815-12-10'::date,
  'date_of_birth untouched by the positive path');

-- =====================================================================
-- C. Protected fields pushed through the RPC (40-50)
-- =====================================================================

select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"legal_first_name":"Mallory"}'::jsonb) $q$,
  '42501', 'Field(s) not writable by this function: legal_first_name',
  'RPC raises on legal_first_name rather than ignoring it');
select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"legal_last_name":"Hacker"}'::jsonb) $q$,
  '42501', 'Field(s) not writable by this function: legal_last_name',
  'RPC raises on legal_last_name');
select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"date_of_birth":"1900-01-01"}'::jsonb) $q$,
  '42501', 'Field(s) not writable by this function: date_of_birth',
  'RPC raises on date_of_birth');
select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"created_at":"2000-01-01T00:00:00Z"}'::jsonb) $q$,
  '42501', 'Field(s) not writable by this function: created_at',
  'RPC raises on created_at');
select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"record_version":"999"}'::jsonb) $q$,
  '42501', 'Field(s) not writable by this function: record_version',
  'RPC raises on record_version');
select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"customer_profile_id":"cpf_deadbeef"}'::jsonb) $q$,
  '42501', 'Field(s) not writable by this function: customer_profile_id',
  'RPC raises on customer_profile_id');

-- An allowed key alongside a protected one must reject the whole call.
select throws_ok(
  $q$ select * from public.update_customer_profile_preferences(
        '{"display_name":"partially applied?","legal_last_name":"Hacker"}'::jsonb) $q$,
  '42501', 'Field(s) not writable by this function: legal_last_name',
  'a mixed payload is rejected whole');
select is((select display_name from public.customer_profiles), 'Ada Lovelace',
  'the allowed half of the mixed payload was NOT applied');

select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"display_name":123}'::jsonb) $q$,
  '22023', 'Field(s) must be a string or null: display_name',
  'RPC raises on a numeric value for an allowed key');
select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"timezone":{"a":1}}'::jsonb) $q$,
  '22023', 'Field(s) must be a string or null: timezone',
  'RPC raises on an object value for an allowed key');
select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"preferred_locale":["en"]}'::jsonb) $q$,
  '22023', 'Field(s) must be a string or null: preferred_locale',
  'RPC raises on an array value for an allowed key');

-- =====================================================================
-- D. Direct UPDATE on the table as authenticated (51-54)
-- =====================================================================

select throws_ok(
  $q$ update public.customer_profiles set display_name = 'direct-write'
       where customer_id = '11111111-1111-4111-8111-111111111111'::uuid $q$,
  '42501', 'permission denied for table customer_profiles',
  'direct UPDATE of an allowed column on own row is denied (no column-level grant either)');
select throws_ok(
  $q$ update public.customer_profiles set legal_first_name = 'Mallory'
       where customer_id = '11111111-1111-4111-8111-111111111111'::uuid $q$,
  '42501', 'permission denied for table customer_profiles',
  'direct UPDATE of a KYC column on own row is denied');
select throws_ok(
  $q$ update public.customer_profiles set display_name = 'all-of-them' $q$,
  '42501', 'permission denied for table customer_profiles',
  'unqualified direct UPDATE is denied');
select is((select display_name from public.customer_profiles), 'Ada Lovelace',
  'no direct UPDATE took effect');

-- =====================================================================
-- E. User A reaching user B (55-58)
--
-- The RPC has no target-user parameter, so the reachable surface is the patch
-- payload. Forging a JWT with sub = B is out of scope: it needs the signing
-- secret. E3/E4 prove the `where customer_id = caller` clause is the boundary.
-- =====================================================================

select throws_ok(
  $q$ select * from public.update_customer_profile_preferences(
        '{"customer_id":"22222222-2222-4222-8222-222222222222"}'::jsonb) $q$,
  '42501', 'Field(s) not writable by this function: customer_id',
  'A cannot reparent a profile by passing customer_id');
select throws_ok(
  $q$ select * from public.update_customer_profile_preferences(
        '{"display_name":"pwned","customer_id":"22222222-2222-4222-8222-222222222222"}'::jsonb) $q$,
  '42501', 'Field(s) not writable by this function: customer_id',
  'A cannot smuggle customer_id alongside an allowed field');

select lives_ok(
  $q$ select * from public.update_customer_profile_preferences(
        '{"display_name":"A only","timezone":"UTC"}'::jsonb) $q$,
  'A can still update A''s own row');

select is(
  (select count(*)::int from public.customer_profiles
    where customer_id = '22222222-2222-4222-8222-222222222222'::uuid),
  0, 'A cannot see B''s row at all');

-- =====================================================================
-- F. anon (59-64)
-- =====================================================================

set local role anon;
set local request.jwt.claims = '';
set local request.jwt.claim.sub = '';

select is(current_user::text, 'anon', 'impersonation: current_user is anon');
select ok(auth.uid() is null, 'impersonation: auth.uid() is null for anon');

select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"display_name":"anon was here"}'::jsonb) $q$,
  '42501', 'permission denied for function update_customer_profile_preferences',
  'anon is stopped at the EXECUTE grant, before the RPC body runs');
select throws_ok(
  $q$ update public.customer_profiles set display_name = 'anon was here' $q$,
  '42501', 'permission denied for table customer_profiles',
  'anon cannot UPDATE the table');
select throws_ok(
  $q$ select display_name from public.customer_profiles $q$,
  '42501', 'permission denied for table customer_profiles',
  'anon cannot SELECT the table');
select throws_ok(
  $q$ truncate public.customer_profiles $q$,
  '42501', 'permission denied for table customer_profiles',
  'anon cannot TRUNCATE the table');

-- =====================================================================
-- G/H. authenticated with no JWT, and TRUNCATE as authenticated (65-66)
-- =====================================================================

reset role;
set local role authenticated;

select throws_ok(
  $q$ select * from public.update_customer_profile_preferences('{"display_name":"no jwt"}'::jsonb) $q$,
  '28000', 'Not authenticated',
  'the RPC rejects a caller with no JWT claims');

-- TRUNCATE ignores RLS and needs no UPDATE or DELETE grant, so a surviving
-- grant here would empty the table regardless of every policy above.
select throws_ok(
  $q$ truncate public.customer_profiles $q$,
  '42501', 'permission denied for table customer_profiles',
  'authenticated cannot TRUNCATE the table');

reset role;

-- =====================================================================
-- I. The immutability trigger, against the table owner (67-71)
--
-- postgres bypasses RLS and needs no grants, so this is the only layer left
-- for a server-side write. It must hold there too.
-- =====================================================================

select throws_ok(
  $q$ update public.customer_profiles set customer_id = '22222222-2222-4222-8222-222222222222'::uuid
       where customer_id = '11111111-1111-4111-8111-111111111111'::uuid $q$,
  '23514', 'customer_profiles.customer_id is immutable',
  'the trigger blocks customer_id changes even for the owner');
select throws_ok(
  $q$ update public.customer_profiles set customer_profile_id = 'cpf_00000000'
       where customer_id = '11111111-1111-4111-8111-111111111111'::uuid $q$,
  '23514', 'customer_profiles.customer_profile_id is immutable',
  'the trigger blocks customer_profile_id changes');
select throws_ok(
  $q$ update public.customer_profiles set created_at = now() - interval '1 year'
       where customer_id = '11111111-1111-4111-8111-111111111111'::uuid $q$,
  '23514', 'customer_profiles.created_at is immutable',
  'the trigger blocks created_at changes');
select throws_ok(
  $q$ update public.customer_profiles set id = gen_random_uuid()
       where customer_id = '11111111-1111-4111-8111-111111111111'::uuid $q$,
  '23514', 'customer_profiles.id is immutable',
  'the trigger blocks id changes');

-- B must be byte-for-byte identical to its seeded state after everything above.
select is(
  (select to_jsonb(p) from public.customer_profiles p
    where p.customer_id = '22222222-2222-4222-8222-222222222222'::uuid),
  (select row_json from zl_snap_b),
  'user B''s row is byte-for-byte unchanged after every attempt');

select * from finish();

rollback;
