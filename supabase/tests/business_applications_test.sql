begin;
create extension if not exists pgtap;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('11f11111-1111-4111-8111-111111111111','business-writer@example.test',now(),'{"legal_first_name":"Business","legal_last_name":"Applicant","date_of_birth":"1990-01-01"}'),
 ('22f22222-2222-4222-8222-222222222222','other-writer@example.test',now(),'{"legal_first_name":"Business","legal_last_name":"Applicant","date_of_birth":"1990-01-01"}'),
 ('33f33333-3333-4333-8333-333333333333','unverified-writer@example.test',null,'{"legal_first_name":"Business","legal_last_name":"Applicant","date_of_birth":"1990-01-01"}');
create temporary table fixture as select '{"version":1,"step":4,"values":{"partnership":"other","business_name":"Edited business","contact_name":"Sample contact","work_email":"contact@example.test","address_line_1":"123 Example","city":"Charlotte","region":"NC","postal_code":"28202","country":"US","business_type":"brand","service_area":"local","other_partnership":"An edited proposal","capacity_ack":true,"submit_authority":true},"listings":[],"files":[]}'::jsonb as doc;
grant select on fixture to authenticated;

select ok(not has_table_privilege('anon','public.business_applications','select'), 'guests cannot read applications');
select ok(not has_table_privilege('authenticated','public.business_applications','update'), 'writes require the validated RPC');
set local role authenticated;
select set_config('request.jwt.claim.sub','11f11111-1111-4111-8111-111111111111',true);
select is(public.save_business_application(doc,0,false),1,'create account-owned draft') from fixture;
select is((select document from public.business_applications),doc,'every field round trips') from fixture;
select is(public.save_business_application(doc,0,false),1,'first save can be retried') from fixture;
select throws_ok($$select public.save_business_application(jsonb_set(doc,'{values,auto_relist}','"true"'),1,true) from fixture$$,'22023','Invalid application document','a text value cannot bypass billing authorization');
select throws_ok($$select public.save_business_application(jsonb_set(doc,'{step}','3'),0,false) from fixture$$,'PT409','Application changed in another session','stale tab cannot overwrite');
select throws_ok($$select public.save_business_application(doc #- '{values,submit_authority}',1,true) from fixture$$,'22023','Complete the required fields and authorizations','submission needs explicit authority');
select throws_ok($$select public.save_business_application(jsonb_set(doc,'{files}','[{"id":"11f11111-1111-4111-8111-111111111116","name":"missing.pdf","listingIndex":null}]'),1,false) from fixture$$,'22023','An attachment is missing or invalid','a missing or foreign object cannot be attached');
select is(public.save_business_application(doc,1,true),2,'submit complete application') from fixture;
select is(public.save_business_application(doc,1,true),2,'submission retry is idempotent') from fixture;
select ok((select status='submitted' and submitted_at is not null from public.business_applications),'review receipt is backed by the database');
select throws_ok($$select public.save_business_application(doc,2,false) from fixture$$,'PT409','Application changed in another session','submission cannot revert to draft');
select set_config('request.jwt.claim.sub','22f22222-2222-4222-8222-222222222222',true);
select is((select count(*) from public.business_applications),0::bigint,'other business cannot read the submission');
select is(public.save_business_application(doc,0,false),1,'second business has an independent application') from fixture;
select set_config('request.jwt.claim.sub','33f33333-3333-4333-8333-333333333333',true);
select throws_ok($$select public.save_business_application(doc,0,false) from fixture$$,'42501','A verified account is required','unverified account cannot write');
reset role;
select * from finish();
rollback;
