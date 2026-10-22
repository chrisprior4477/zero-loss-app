-- Transactional fixtures: leaves existing profiles and preferences untouched.
begin;
create extension if not exists pgtap;
select no_plan();

select is_definer('preferences_private', 'set_mobile_logo_size', array['integer']);
select isnt_definer('public', 'set_mobile_logo_size', array['integer']);
select function_privs_are('public', 'set_mobile_logo_size', array['integer'], 'anon', array[]::text[]);
select function_privs_are('public', 'set_mobile_logo_size', array['integer'], 'authenticated', array['EXECUTE']);
select ok(not has_table_privilege('authenticated', 'public.customer_profiles', 'UPDATE'), 'No direct profile writes reopened');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000'::uuid, id::uuid, 'authenticated', 'authenticated', email,
  'unused.test.fixture', now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"legal_first_name":"Logo","legal_last_name":"Test","date_of_birth":"1990-01-01"}'::jsonb,
  now(), now(), '', '', '', ''
from (values
  ('fb511fb7-caea-4ed3-a2b6-703e347628a1', 'logo-a@example.test'),
  ('fb511fb7-caea-4ed3-a2b6-703e347628b2', 'logo-b@example.test')
) as fixtures(id, email);

create temporary table logo_profile_snapshots as
select customer_id, to_jsonb(p) as snapshot from public.customer_profiles p
where customer_id in ('fb511fb7-caea-4ed3-a2b6-703e347628a1', 'fb511fb7-caea-4ed3-a2b6-703e347628b2');

set local role authenticated;
set local request.jwt.claims = '{"sub":"fb511fb7-caea-4ed3-a2b6-703e347628a1","role":"authenticated"}';
set local request.jwt.claim.sub = 'fb511fb7-caea-4ed3-a2b6-703e347628a1';
select is(auth.uid(), 'fb511fb7-caea-4ed3-a2b6-703e347628a1'::uuid, 'Authenticated as fixture A');
select is((select count(*)::integer from public.customer_profiles), 1, 'RLS exposes only own profile');
select is((select mobile_logo_size::integer from public.customer_profiles), 0, 'Original size is the default');
select lives_ok(format('select public.set_mobile_logo_size(%s)', size), format('Can save %s percent', size)) from unnest(array[0,5,10,15,20,25,30,35]) size;
select is((select mobile_logo_size::integer from public.customer_profiles), 35, 'Preference persists on a new read');
select is((select record_version from public.customer_profiles), 8, 'Only changed preferences advance record version');
select lives_ok('select public.set_mobile_logo_size(35)', 'Retrying the same value succeeds');
select is((select record_version from public.customer_profiles), 8, 'Same-value save is idempotent');
select throws_ok('select public.set_mobile_logo_size(40)', '22023', 'Choose a valid mobile logo size', 'Removed 40 percent is rejected');
select throws_ok('select public.set_mobile_logo_size(null)', '22023', 'Choose a valid mobile logo size', 'Null is rejected');
select throws_ok('select public.set_mobile_logo_size(-5)', '22023', 'Choose a valid mobile logo size', 'Negative size is rejected');
select lives_ok('select public.set_mobile_logo_size(0)', 'Can restore Original size');
select is((select mobile_logo_size::integer from public.customer_profiles), 0, 'Original size is persisted');

set local request.jwt.claims = '';
set local request.jwt.claim.sub = '';
select throws_ok('select public.set_mobile_logo_size(5)', '42501', 'Authentication required', 'Missing identity cannot save');
set local request.jwt.claim.sub = 'fb511fb7-caea-4ed3-a2b6-703e347628c3';
select throws_ok('select public.set_mobile_logo_size(5)', 'P0002', 'Profile not found', 'Missing profile is reported');
set local role anon;
select throws_ok('select public.set_mobile_logo_size(5)', '42501', 'permission denied for function set_mobile_logo_size', 'Anonymous save is denied');

reset role;
select is((select to_jsonb(p) from public.customer_profiles p where customer_id = 'fb511fb7-caea-4ed3-a2b6-703e347628b2'),
  (select snapshot from logo_profile_snapshots where customer_id = 'fb511fb7-caea-4ed3-a2b6-703e347628b2'), 'Other account is byte-for-byte unchanged');
select is((select to_jsonb(p) - 'mobile_logo_size' - 'record_version' - 'updated_at' from public.customer_profiles p where customer_id = 'fb511fb7-caea-4ed3-a2b6-703e347628a1'),
  (select snapshot - 'mobile_logo_size' - 'record_version' - 'updated_at' from logo_profile_snapshots where customer_id = 'fb511fb7-caea-4ed3-a2b6-703e347628a1'), 'Menu layout and all other profile fields stay unchanged');
select * from finish();
rollback;
