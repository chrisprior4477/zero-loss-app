-- Standalone rollback-only membership checks for the personal-demo RPC.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $test$
declare
 owner_device text:=encode(sha256(gen_random_uuid()::text::bytea),'hex');
 friend_device text:=encode(sha256(gen_random_uuid()::text::bytea),'hex');
 desktop_device text:=encode(sha256(gen_random_uuid()::text::bytea),'hex');
 link text:=encode(sha256(gen_random_uuid()::text::bytea),'hex');
 a jsonb; b jsonb; c jsonb; pending text;
begin
 assert not has_function_privilege('anon','public.personal_demo_device(text,text,text,text)','EXECUTE');
 assert not has_function_privilege('authenticated','public.personal_demo_device(text,text,text,text)','EXECUTE');
 a:=public.personal_demo_device(owner_device,'start','',owner_device);
 b:=public.personal_demo_device(friend_device,'start','',friend_device);
 c:=public.personal_demo_device(desktop_device,'start','',desktop_device);
 assert a->>'code'<>b->>'code' and a->>'subject'<>c->>'subject';
 assert public.personal_demo_device(owner_device,'start','',owner_device)->>'subject'=a->>'subject';
 perform public.personal_demo_device(owner_device,'share',link);
 assert public.personal_demo_device(friend_device,'inspect',link)->>'sharedCode'=a->>'code';
 assert public.personal_demo_device(friend_device,'join',link)->>'subject'=a->>'subject';
 begin perform public.personal_demo_device(friend_device,'revoke'); raise exception 'Guest became an owner';
 exception when insufficient_privilege then null; end;
 perform public.personal_demo_device(desktop_device,'request',a->>'code');
 pending:=public.personal_demo_device(owner_device,'state')->>'pending';
 assert pending is not null;
 begin perform public.personal_demo_device(friend_device,'allow',pending); raise exception 'Guest approved a new owner';
 exception when insufficient_privilege then null; end;
 perform public.personal_demo_device(owner_device,'allow',pending);
 assert public.personal_demo_device(desktop_device,'session')->>'subject'=a->>'subject';
 perform public.personal_demo_device(owner_device,'revoke');
 assert public.personal_demo_device(friend_device,'session')->>'subject'=b->>'subject';
 assert public.personal_demo_device(friend_device,'state')->'notice'->>'kind'='ended';
 assert public.personal_demo_device(desktop_device,'session')->>'subject'=a->>'subject';
 begin
   perform public.personal_demo_device(friend_device,'join',link);
   raise exception 'Old link still works' using errcode='XX000';
 exception when raise_exception then null; end;
end $test$;
rollback;
