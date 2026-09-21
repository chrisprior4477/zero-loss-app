-- Reserve each password-check attempt before calling Auth, including failures.
-- This per-account throttle supplements (does not replace) Supabase Auth limits.
begin;
create table demo_private.funding_authentication_attempts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  request_key text not null check (request_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  amount integer not null check (amount between 100 and 50000),
  created_at timestamptz not null default clock_timestamp()
);
create index funding_authentication_attempts_recent on demo_private.funding_authentication_attempts(customer_id,created_at desc);
alter table demo_private.funding_authentication_attempts enable row level security;
revoke all on demo_private.funding_authentication_attempts from public,anon,authenticated,service_role;

create function public.begin_demo_funding_authentication(p_amount integer,p_request_key text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_wallet uuid; v_id uuid;
begin
  perform demo_private.assert_card_environment();
  v_wallet:=demo_private.lock_funding_wallet();
  if p_amount is null or p_amount not between 100 and 50000
    or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid funding confirmation' using errcode='22023';
  end if;
  if (select count(*) from demo_private.funding_authentication_attempts
    where customer_id=auth.uid() and created_at>clock_timestamp()-interval '15 minutes')>=5 then
    raise exception 'Too many deposit confirmation attempts. Wait 15 minutes before trying again.' using errcode='P0001';
  end if;
  insert into demo_private.funding_authentication_attempts(customer_id,wallet_account_id,request_key,amount)
    values(auth.uid(),v_wallet,p_request_key,p_amount) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.begin_demo_funding_authentication(integer,text) from public,anon,authenticated,service_role;
grant execute on function public.begin_demo_funding_authentication(integer,text) to authenticated;

create function demo_private.guard_funding_authentication_attempt_history() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Funding authentication attempt history is immutable' using errcode='42501';
end $$;
revoke all on function demo_private.guard_funding_authentication_attempt_history() from public,anon,authenticated,service_role;
create trigger funding_authentication_attempt_history before update or delete on demo_private.funding_authentication_attempts
  for each row execute function demo_private.guard_funding_authentication_attempt_history();
create trigger funding_authentication_attempt_no_truncate before truncate on demo_private.funding_authentication_attempts
  for each statement execute function demo_private.guard_funding_authentication_attempt_history();
notify pgrst,'reload schema';
commit;
