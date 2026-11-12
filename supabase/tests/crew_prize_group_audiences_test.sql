begin;
-- No fixtures or queued deliveries are committed.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('ca190001-1111-4111-8111-111111111111','crew-audience-owner@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Owner","date_of_birth":"1990-01-01"}'),
 ('ca190002-1111-4111-8111-111111111111','crew-audience-overlap@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Overlap","date_of_birth":"1990-01-01"}'),
 ('ca190003-1111-4111-8111-111111111111','crew-audience-left@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Left","date_of_birth":"1990-01-01"}'),
 ('ca190004-1111-4111-8111-111111111111','crew-audience-scope@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Scope","date_of_birth":"1990-01-01"}'),
 ('ca190005-1111-4111-8111-111111111111','crew-audience-global@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"Global","date_of_birth":"1990-01-01"}'),
 ('ca190006-1111-4111-8111-111111111111','crew-audience-new@example.test',now(),'{"legal_first_name":"Crew","legal_last_name":"New","date_of_birth":"1990-01-01"}');
insert into demo_private.preview_entry_offerings(slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,sample_entries)
 values('crew-audience-fixture','Crew audience fixture','Test','Test','/test.png',2500,100,50,0);
insert into public.crew_invitations(requester_id,recipient_id,requester_name,recipient_name,status,responded_at)
 select 'ca190001-1111-4111-8111-111111111111', id, 'Owner', 'Member', 'accepted', now()
 from auth.users where email in ('crew-audience-overlap@example.test','crew-audience-left@example.test',
  'crew-audience-scope@example.test','crew-audience-global@example.test','crew-audience-new@example.test');
insert into public.crew_visibility_settings(owner_id,groups) values
 ('ca190001-1111-4111-8111-111111111111', '[
  {"id":"ca190011-1111-4111-8111-111111111111","name":"First","memberIds":["ca190002-1111-4111-8111-111111111111","ca190004-1111-4111-8111-111111111111","ca190005-1111-4111-8111-111111111111"]},
  {"id":"ca190012-1111-4111-8111-111111111111","name":"Second","memberIds":["ca190002-1111-4111-8111-111111111111","ca190004-1111-4111-8111-111111111111","ca190005-1111-4111-8111-111111111111","ca190006-1111-4111-8111-111111111111"]}
 ]');
insert into public.crew_receiving_preferences(owner_id,recipient_id,scope_key,receiving) values
 ('ca190001-1111-4111-8111-111111111111','ca190004-1111-4111-8111-111111111111','ca190011-1111-4111-8111-111111111111',false),
 ('ca190001-1111-4111-8111-111111111111','ca190005-1111-4111-8111-111111111111','crew',false);

set local role authenticated;
set local request.jwt.claim.sub='ca190001-1111-4111-8111-111111111111';
do $$
declare
  selected jsonb := '{
   "ca190011-1111-4111-8111-111111111111":["ca190002-1111-4111-8111-111111111111","ca190003-1111-4111-8111-111111111111","ca190004-1111-4111-8111-111111111111","ca190005-1111-4111-8111-111111111111"],
   "ca190012-1111-4111-8111-111111111111":["ca190002-1111-4111-8111-111111111111","ca190004-1111-4111-8111-111111111111","ca190005-1111-4111-8111-111111111111"]
  }';
  result jsonb;
begin
  result := public.share_prize_with_crew_groups('crew-audience-fixture', selected);
  assert result = '{"queued":2,"alreadyShared":0,"groupCount":2,"partial":true}', 'Only eligible, selected recipients are queued';
  result := public.share_prize_with_crew_groups('crew-audience-fixture', selected);
  assert result = '{"queued":0,"alreadyShared":2,"groupCount":2,"partial":true}', 'Retry deduplicates delivery';
  begin
    perform public.share_prize_with_crew_groups('crew-audience-fixture', selected || '{"ca190099-1111-4111-8111-111111111111":[]}');
    raise exception 'Missing group accepted';
  exception when sqlstate 'PT409' then null;
  end;
  result := public.share_prize_with_crew('crew-audience-fixture', array['ca190002-1111-4111-8111-111111111111']::uuid[]);
  assert result->>'queued' = '0' and result->>'alreadyShared' = '1', 'Legacy whole-Crew share still deduplicates';
end;
$$;

reset role;
do $$
begin
  assert (select count(*) = 2 from public.crew_prize_share_emails where offering_slug = 'crew-audience-fixture'), 'One email per person';
  assert (select array_agg(l.scope_key || ':' || s.recipient_id::text order by l.scope_key, s.recipient_id)
    from public.received_product_shares s join public.product_share_links l on l.token=s.token
    where l.offering_slug = 'crew-audience-fixture') = array[
     'ca190011-1111-4111-8111-111111111111:ca190002-1111-4111-8111-111111111111',
     'ca190012-1111-4111-8111-111111111111:ca190002-1111-4111-8111-111111111111',
     'ca190012-1111-4111-8111-111111111111:ca190004-1111-4111-8111-111111111111'
    ], 'Receipts preserve allowed groups and exclude stale, unselected, or opted-out scope';
end;
$$;
update public.crew_prize_share_emails set status='processing' where offering_slug='crew-audience-fixture';
insert into public.crew_receiving_preferences(owner_id,recipient_id,scope_key,receiving) values
 ('ca190001-1111-4111-8111-111111111111','ca190004-1111-4111-8111-111111111111','ca190012-1111-4111-8111-111111111111',false);
do $$
declare
  allowed record;
  stopped record;
begin
  select * into allowed from public.crew_prize_share_emails where offering_slug='crew-audience-fixture' and recipient_id='ca190002-1111-4111-8111-111111111111';
  select * into stopped from public.crew_prize_share_emails where offering_slug='crew-audience-fixture' and recipient_id='ca190004-1111-4111-8111-111111111111';
  assert (public.get_crew_prize_share_email_payload(allowed.id)->>'eligible')::boolean, 'Allowed delivery remains eligible';
  assert not (public.get_crew_prize_share_email_payload(stopped.id)->>'eligible')::boolean, 'Worker respects later opt-out';
end;
$$;
rollback;
