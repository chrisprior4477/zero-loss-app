-- Rollback-only owner isolation and contact editing checks.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('ca220001-1111-4111-8111-111111111111','member-label-owner@example.test',now(),'{"legal_first_name":"Label","legal_last_name":"Owner","date_of_birth":"1990-01-01"}'),
('ca220002-1111-4111-8111-111111111111','member-label-friend@example.test',now(),'{"legal_first_name":"Label","legal_last_name":"Friend","date_of_birth":"1990-01-01"}'),
('ca220003-1111-4111-8111-111111111111','member-label-outsider@example.test',now(),'{"legal_first_name":"Label","legal_last_name":"Outsider","date_of_birth":"1990-01-01"}');
update public.customers set status='active',verification_status='email_verified' where id::text like 'ca22000%';
insert into public.crew_invitations(requester_id,recipient_id,requester_name,recipient_name,status,responded_at)
values('ca220001-1111-4111-8111-111111111111','ca220002-1111-4111-8111-111111111111','Owner','Friend','accepted',now());
set local role authenticated;
set local request.jwt.claim.sub='ca220001-1111-4111-8111-111111111111';
select public.save_crew_member_contact('ca220002-1111-4111-8111-111111111111','{"name":"My friend","phone":"1111111111","email":"friend@example.test"}');
do $$ begin
  assert (select member_contacts->'ca220002-1111-4111-8111-111111111111'->>'name'='My friend' from public.crew_visibility_settings where owner_id=auth.uid()),'saved owner contact';
  assert exists(select 1 from public.get_crew_member_profiles() where member_id='ca220002-1111-4111-8111-111111111111' and name='My friend'),'Crew uses owner label';
  begin perform public.save_crew_member_contact('ca220003-1111-4111-8111-111111111111','{"name":"Not connected","phone":"","email":""}'); raise exception 'Unconnected write allowed'; exception when insufficient_privilege then null; end;
  begin perform public.save_crew_member_contact('ca220002-1111-4111-8111-111111111111','{"name":"Invalid","phone":"123","email":""}'); raise exception 'Invalid phone allowed'; exception when invalid_parameter_value then null; end;
  begin perform public.save_crew_member_contact('ca220002-1111-4111-8111-111111111111','{"name":"Invalid","phone":"","email":"bad"}'); raise exception 'Invalid email allowed'; exception when invalid_parameter_value then null; end;
end $$;
select public.save_crew_member_contact('ca220002-1111-4111-8111-111111111111','{"name":"Friend renamed","phone":"","email":""}');
do $$ begin
  assert (select member_contacts->'ca220002-1111-4111-8111-111111111111'->>'phone'='' from public.crew_visibility_settings where owner_id=auth.uid()),'optional details can be cleared';
end $$;
set local request.jwt.claim.sub='ca220002-1111-4111-8111-111111111111';
do $$ begin
  assert (select count(*)=0 from public.crew_visibility_settings where owner_id='ca220001-1111-4111-8111-111111111111'),'friend cannot read owner contact details';
end $$;
set local request.jwt.claim.sub='ca220003-1111-4111-8111-111111111111';
do $$ begin
  assert (select count(*)=0 from public.crew_visibility_settings where owner_id='ca220001-1111-4111-8111-111111111111'),'outsider cannot read owner contacts';
  begin perform public.save_crew_member_contact('ca220002-1111-4111-8111-111111111111','{"name":"Wrong owner","phone":"","email":""}'); raise exception 'Outsider write allowed'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin perform public.save_crew_member_contact('ca220002-1111-4111-8111-111111111111','{"name":"Anonymous","phone":"","email":""}'); raise exception 'Anonymous write allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert (select display_name is distinct from 'Friend renamed' from public.customer_profiles where customer_id='ca220002-1111-4111-8111-111111111111'),'public identity unchanged';
end $$;
rollback;
select 'PASS: owner-scoped labels, optional contact edits, RLS isolation and authorization' as result;
