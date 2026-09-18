begin;
create extension if not exists pgtap;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('96999999-9999-4999-8999-999999999991','profile-one@example.test',now(),'{"legal_first_name":"Profile","legal_last_name":"One","date_of_birth":"1990-01-01"}'::jsonb),
  ('96999999-9999-4999-8999-999999999992','profile-two@example.test',now(),'{"legal_first_name":"Profile","legal_last_name":"Two","date_of_birth":"1991-02-02"}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub','96999999-9999-4999-8999-999999999991',true);
select lives_ok($$select * from public.update_customer_profile_preferences('{
  "display_name":"Chris Prior","phone_number":"(910) 555-0147","address_line_1":"125 Market Street",
  "address_line_2":"Unit 4","city":"Wilmington","region":"NC","postal_code":"28401",
  "country":"United States","preferred_locale":"en-US","timezone":"America/New_York"
}'::jsonb)$$,'owner may save traditional profile details');
select is((select phone_number from public.customer_profiles where customer_id=auth.uid()),'(910) 555-0147','owner reads saved phone');
select is((select address_line_1 from public.customer_profiles where customer_id=auth.uid()),'125 Market Street','owner reads saved address');
select is((select city from public.customer_profiles where customer_id=auth.uid()),'Wilmington','owner reads saved city');
select is((select timezone from public.customer_profiles where customer_id=auth.uid()),'America/New_York','owner reads saved timezone');
select lives_ok($$select * from public.update_customer_profile_preferences('{"legal_first_name":"Changed","legal_last_name":"Customer","date_of_birth":"1992-03-04"}'::jsonb)$$,'owner may correct legal identity through the protected RPC');
select is((select legal_first_name from public.customer_profiles where customer_id=auth.uid()),'Changed','corrected legal first name is stored');
select is((select date_of_birth from public.customer_profiles where customer_id=auth.uid()),'1992-03-04'::date,'corrected date of birth is stored');
select throws_ok($$select * from public.update_customer_profile_preferences('{"date_of_birth":"2020-01-01"}'::jsonb)$$,'22023','Customer must be at least 18 years old','underage birth date is rejected');
select throws_ok($$select * from public.update_customer_profile_preferences('{"phone_number":123}'::jsonb)$$,'22023',null,'non-string contact field rejected');
select throws_ok($$update public.customer_profiles set phone_number='direct-write' where customer_id=auth.uid()$$,'42501',null,'direct profile writes remain denied');

select set_config('request.jwt.claim.sub','96999999-9999-4999-8999-999999999992',true);
select is((select phone_number from public.customer_profiles where customer_id=auth.uid()),null::text,'second account cannot read first account phone');
select lives_ok($$select * from public.update_customer_profile_preferences('{"display_name":"Second Customer","phone_number":"+1 212 555 0199"}'::jsonb)$$,'second account updates only itself');
reset role;
select is((select phone_number from public.customer_profiles where customer_id='96999999-9999-4999-8999-999999999991'),'(910) 555-0147','second account did not alter first account');
set local role anon;
select throws_ok($$select * from public.update_customer_profile_preferences('{"display_name":"Anonymous"}'::jsonb)$$,'42501',null,'anonymous update denied');
reset role;
select * from finish();
rollback;
