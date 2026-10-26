-- Run within a transaction; fixtures and email queues are rolled back.
begin;
create extension if not exists pgtap;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('76200111-1111-4111-8111-111111111111','auto-crew-sender@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Sender","date_of_birth":"1990-01-01"}'),
('76200222-2222-4222-8222-222222222222','auto-crew-recipient@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Recipient","date_of_birth":"1990-01-01"}'),
('76200333-3333-4333-8333-333333333333','auto-crew-other@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Other","date_of_birth":"1990-01-01"}');
update public.customers set status='active' where id in ('76200111-1111-4111-8111-111111111111','76200222-2222-4222-8222-222222222222','76200333-3333-4333-8333-333333333333');
update public.customer_profiles set crew_find_email=true,crew_discoverable=true,crew_find_real_name=true where customer_id in ('76200111-1111-4111-8111-111111111111','76200222-2222-4222-8222-222222222222','76200333-3333-4333-8333-333333333333');
set local role authenticated;
set local request.jwt.claim.sub='76200111-1111-4111-8111-111111111111';
do $$ begin
  assert public.request_crew_invitation('auto-crew-recipient@example.test')='accepted_for_delivery','email result remains private';
  assert public.request_crew_invitation('missing-auto-crew@example.test')='accepted_for_delivery','missing contact has identical result';
  assert public.request_crew_invitation_by_id('76200222-2222-4222-8222-222222222222')='connected','retry succeeds';
  assert (select count(*) from public.crew_invitations where requester_id=auth.uid() and recipient_id='76200222-2222-4222-8222-222222222222' and status='accepted' and automatic_connection)=1,'one durable automatic connection';
  assert not public.crew_can_view_shared_entry('76200222-2222-4222-8222-222222222222','76200999-9999-4999-8999-999999999999'),'adding never reveals recipient picks';
end $$;
set local request.jwt.claim.sub='76200222-2222-4222-8222-222222222222';
do $$ declare v_id uuid; begin
  select id into v_id from public.crew_invitations where recipient_id=auth.uid() and requester_id='76200111-1111-4111-8111-111111111111';
  assert public.crew_can_view_shared_entry('76200111-1111-4111-8111-111111111111','76200999-9999-4999-8999-999999999999'),'recipient can view sender shared audience';
  perform public.set_crew_share_back(v_id,true);
end $$;
set local request.jwt.claim.sub='76200111-1111-4111-8111-111111111111';
do $$ begin assert public.crew_can_view_shared_entry('76200222-2222-4222-8222-222222222222','76200999-9999-4999-8999-999999999999'),'explicit share back grants audience'; end $$;
set local request.jwt.claim.sub='76200333-3333-4333-8333-333333333333';
do $$ begin
  assert (select count(*) from public.crew_invitations where requester_id='76200111-1111-4111-8111-111111111111')=0,'membership RLS isolates outsiders';
  assert not public.crew_can_view_shared_entry('76200222-2222-4222-8222-222222222222','76200999-9999-4999-8999-999999999999'),'outsiders never see picks';
end $$;
reset role;
do $$ declare v_id uuid; begin
  select id into v_id from public.crew_invitations where requester_id='76200111-1111-4111-8111-111111111111' and recipient_id='76200222-2222-4222-8222-222222222222';
  assert (select count(*) from public.crew_invitation_email_deliveries where invitation_id=v_id)=1,'one notification email despite repeated adds';
  perform set_config('test.crew_id',v_id::text,true);
end $$;
set local role authenticated;
set local request.jwt.claim.sub='76200333-3333-4333-8333-333333333333';
do $$ begin
  begin perform public.remove_crew_connection(current_setting('test.crew_id')::uuid); raise exception 'outsider removed membership'; exception when insufficient_privilege then null; end;
  begin perform public.set_crew_share_back(current_setting('test.crew_id')::uuid,true); raise exception 'outsider changed sharing'; exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub='76200222-2222-4222-8222-222222222222';
do $$ begin
  perform public.remove_crew_connection(current_setting('test.crew_id')::uuid);
  perform public.remove_crew_connection(current_setting('test.crew_id')::uuid);
  assert not public.crew_can_view_shared_entry('76200111-1111-4111-8111-111111111111','76200999-9999-4999-8999-999999999999'),'leave revokes access immediately and retries safely';
end $$;
set local request.jwt.claim.sub='76200111-1111-4111-8111-111111111111';
do $$ begin
  assert public.request_crew_invitation_by_id('76200222-2222-4222-8222-222222222222')='unavailable','repeated add honors opt-out';
  assert public.request_crew_invitation('auto-crew-recipient@example.test')='accepted_for_delivery','opt-out is private to contact lookup';
  assert not public.crew_can_view_shared_entry('76200222-2222-4222-8222-222222222222','76200999-9999-4999-8999-999999999999'),'leave also revokes sharing back';
end $$;
reset role;
do $$ begin
  assert not has_function_privilege('anon','public.request_crew_invitation(text)','execute'),'guests cannot add';
  assert not has_function_privilege('anon','public.set_crew_share_back(uuid,boolean)','execute'),'guests cannot grant access';
  assert not has_table_privilege('authenticated','public.crew_invitations','insert'),'memberships cannot bypass RPC validation';
end $$;
-- Phone lookup uses the same automatic flow while honoring discoverability.
update public.customer_profiles set phone_number='+12025550123',crew_find_phone=false where customer_id='76200333-3333-4333-8333-333333333333';
set local role authenticated;
set local request.jwt.claim.sub='76200111-1111-4111-8111-111111111111';
do $$ begin
  perform public.request_crew_invitation_by_phone('+1 (202) 555-0123');
  assert not exists(select 1 from public.crew_invitations where requester_id=auth.uid() and recipient_id='76200333-3333-4333-8333-333333333333'),'phone discovery opt-out honored';
end $$;
reset role;
update public.customer_profiles set crew_find_phone=true where customer_id='76200333-3333-4333-8333-333333333333';
set local role authenticated;
set local request.jwt.claim.sub='76200111-1111-4111-8111-111111111111';
do $$ begin
  perform public.request_crew_invitation_by_phone('+1 (202) 555-0123');
  assert exists(select 1 from public.crew_invitations where requester_id=auth.uid() and recipient_id='76200333-3333-4333-8333-333333333333' and status='accepted'),'phone addition is automatic';
end $$;
reset role;
insert into public.crew_invite_links(owner_id,token) values('76200222-2222-4222-8222-222222222222','76200888-8888-4888-8888-888888888888') on conflict(owner_id) do update set token=excluded.token;
set local role authenticated;
set local request.jwt.claim.sub='76200333-3333-4333-8333-333333333333';
do $$ begin
  assert public.request_crew_invitation_from_link('76200888-8888-4888-8888-888888888888')='connected','personal link joins immediately';
  assert exists(select 1 from public.crew_receiving_preferences where owner_id='76200222-2222-4222-8222-222222222222' and recipient_id=auth.uid() and receiving and not share_back),'join receives link owner picks without exposing joiner picks';
end $$;
reset role;
select pass('Automatic connection, directional privacy, ownership, idempotency, and durable opt-out assertions passed');
select * from finish();
rollback;
