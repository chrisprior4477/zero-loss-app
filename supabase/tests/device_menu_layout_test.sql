-- Transactional fixtures: no existing customer choices or demo data are changed.
begin;
create extension if not exists pgtap;
select no_plan();
select is_definer('preferences_private', 'set_device_menu_layout', array['text', 'text']);
select isnt_definer('public', 'set_device_menu_layout', array['text', 'text']);
select function_privs_are('public', 'set_device_menu_layout', array['text', 'text'], 'anon', array[]::text[]);
select function_privs_are('public', 'set_device_menu_layout', array['text', 'text'], 'authenticated', array['EXECUTE']);
select ok(not has_table_privilege('authenticated', 'public.customer_profiles', 'UPDATE'), 'No direct writes reopened');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000'::uuid, id::uuid, 'authenticated', 'authenticated', email,
  'unused.test.fixture', now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"legal_first_name":"Menu","legal_last_name":"Test","date_of_birth":"1990-01-01"}'::jsonb,
  now(), now(), '', '', '', ''
from (values
  ('fb511fb7-caea-4ed3-a2b6-703e347629a1', 'menu-device-a@example.test'),
  ('fb511fb7-caea-4ed3-a2b6-703e347629b2', 'menu-device-b@example.test')
) fixtures(id, email);
create temporary table device_profile_snapshots as
select customer_id, to_jsonb(p) snapshot from public.customer_profiles p
where customer_id in ('fb511fb7-caea-4ed3-a2b6-703e347629a1', 'fb511fb7-caea-4ed3-a2b6-703e347629b2');

set local role authenticated;
set local request.jwt.claims = '{"sub":"fb511fb7-caea-4ed3-a2b6-703e347629a1","role":"authenticated"}';
set local request.jwt.claim.sub = 'fb511fb7-caea-4ed3-a2b6-703e347629a1';
select is((select count(*)::integer from public.customer_profiles), 1, 'RLS exposes only own profile');
select is((select tablet_menu_layout from public.customer_profiles), 'classic', 'Tablet defaults to current Classic');
select is((select desktop_menu_layout from public.customer_profiles), 'classic', 'Desktop defaults to current Classic');
select lives_ok(format('select public.set_device_menu_layout(%L, %L)', layout, device), format('%s can save %s', device, layout))
from unnest(array['mobile','tablet','desktop']) device cross join unnest(array['classic','ending-search','home-ending-search','search-down','search-down-browse','search-over']) layout;

select public.set_device_menu_layout('classic', 'tablet');
select public.set_device_menu_layout('classic', 'desktop');
select public.set_device_menu_layout('home-ending-search', 'mobile');
select is((select menu_layout from public.customer_profiles), 'home-ending-search', 'Mobile persists on read');
select is((select tablet_menu_layout from public.customer_profiles), 'classic', 'Mobile save leaves Tablet alone');
select is((select desktop_menu_layout from public.customer_profiles), 'classic', 'Mobile save leaves Desktop alone');
select public.set_device_menu_layout('search-down', 'tablet');
select public.set_device_menu_layout('search-over', 'desktop');
select is((select menu_layout from public.customer_profiles), 'home-ending-search', 'Other device saves leave Mobile alone');
select is((select tablet_menu_layout from public.customer_profiles), 'search-down', 'Tablet persists separately');
select is((select desktop_menu_layout from public.customer_profiles), 'search-over', 'Desktop persists separately');
select is((select mobile_logo_size::integer from public.customer_profiles), 0, 'Logo preference is untouched');
select is((select record_version from public.customer_profiles), 21, 'Only changed preferences advance record version');
select lives_ok('select public.set_device_menu_layout(''search-over'', ''desktop'')', 'Retry succeeds');
select is((select record_version from public.customer_profiles), 21, 'Same-value retry is idempotent');
select throws_ok('select public.set_device_menu_layout(''classic'', ''all'')', '22023', 'Choose a valid menu device');
select throws_ok('select public.set_device_menu_layout(''unknown'', ''mobile'')', '22023', 'Choose a valid menu layout');
select throws_ok('select public.set_device_menu_layout(null, ''mobile'')', '22023', 'Choose a valid menu layout');
select throws_ok('select public.set_device_menu_layout(''classic'', null)', '22023', 'Choose a valid menu device');
set local request.jwt.claims = '';
set local request.jwt.claim.sub = '';
select throws_ok('select public.set_device_menu_layout(''classic'', ''mobile'')', '42501', 'Authentication required');
set local request.jwt.claim.sub = 'fb511fb7-caea-4ed3-a2b6-703e347629c3';
select throws_ok('select public.set_device_menu_layout(''classic'', ''mobile'')', 'P0002', 'Profile not found');
set local role anon;
select throws_ok('select public.set_device_menu_layout(''classic'', ''mobile'')', '42501', 'permission denied for function set_device_menu_layout');
reset role;
select is((select to_jsonb(p) from public.customer_profiles p where customer_id = 'fb511fb7-caea-4ed3-a2b6-703e347629b2'),
  (select snapshot from device_profile_snapshots where customer_id = 'fb511fb7-caea-4ed3-a2b6-703e347629b2'), 'Other customer remains byte-for-byte unchanged');
select is((select to_jsonb(p) - 'menu_layout' - 'tablet_menu_layout' - 'desktop_menu_layout' - 'record_version' - 'updated_at' from public.customer_profiles p where customer_id = 'fb511fb7-caea-4ed3-a2b6-703e347629a1'),
  (select snapshot - 'menu_layout' - 'tablet_menu_layout' - 'desktop_menu_layout' - 'record_version' - 'updated_at' from device_profile_snapshots where customer_id = 'fb511fb7-caea-4ed3-a2b6-703e347629a1'), 'All other profile data stays unchanged');
select * from finish();
rollback;
