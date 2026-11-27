begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $test$
declare
  owner_key text:=encode(sha256(gen_random_uuid()::text::bytea),'hex');
  guest_key text:=encode(sha256(gen_random_uuid()::text::bytea),'hex');
  invite text:=encode(sha256(gen_random_uuid()::text::bytea),'hex');
  owner_state jsonb; own_guest jsonb; payload jsonb; observed jsonb;
begin
  assert not has_function_privilege('authenticated','public.personal_demo_live_device(text,text,text,text)','EXECUTE');
  assert not has_function_privilege('anon','public.personal_demo_live_device(text,text,text,text)','EXECUTE');
  owner_state:=public.personal_demo_live_device(owner_key,'start','',owner_key);
  own_guest:=public.personal_demo_live_device(guest_key,'start','',guest_key);
  perform public.personal_demo_live_device(owner_key,'share',invite);
  payload:=jsonb_build_object('code',owner_state->>'code','source',gen_random_uuid(),'surface','page',
    'url','/browse','mark','tap','x',33,'y',88);
  perform public.personal_demo_live_device(owner_key,'present',payload::text);
  assert public.personal_demo_live_device(guest_key,'state')->>'view' is null;
  observed:=public.personal_demo_live_device(guest_key,'join',invite);
  assert observed#>>'{view,url}'='/browse';
  perform public.personal_demo_live_device(guest_key,'present',(payload||'{"surface":"categories"}')::text);
  assert public.personal_demo_live_device(owner_key,'state')#>>'{view,surface}'='categories';
  perform public.personal_demo_live_device(owner_key,'revoke');
  observed:=public.personal_demo_live_device(guest_key,'state');
  assert observed->>'view' is null and observed->>'code'=own_guest->>'code';
  begin
    perform public.personal_demo_live_device(guest_key,'present',payload::text);
    raise exception 'Detached device could publish';
  exception when raise_exception then
    if sqlerrm<>'This shared demo has ended.' then raise; end if;
  end;
end $test$;
rollback;
