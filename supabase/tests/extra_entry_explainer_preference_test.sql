begin;
create extension if not exists pgtap;
select no_plan();

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  ('99999999-9999-4999-8999-999999999987','entry-explainer@example.test',now(),'{"legal_first_name":"Entry","legal_last_name":"Explainer","date_of_birth":"1990-01-01"}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999987',true);
select set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999987"}',true);

select ok(public.acknowledge_extra_entry_explainer() is not null,'customer can acknowledge the explainer');
select ok((select extra_entry_explainer_acknowledged_at is not null from public.customer_profiles where customer_id=auth.uid()),'acknowledgment is stored on the owner profile');
select is(public.acknowledge_extra_entry_explainer(),(select extra_entry_explainer_acknowledged_at from public.customer_profiles where customer_id=auth.uid()),'repeated acknowledgment is idempotent');

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select throws_ok($$ select public.acknowledge_extra_entry_explainer() $$,'28000','Not authenticated','anonymous callers cannot write the preference');
reset role;

select * from finish();
rollback;
