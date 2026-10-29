-- Owner-approved whole-dollar deposits. Historical amounts and recovery stay exact.
begin;
create function demo_private.enforce_whole_dollar_deposit() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.amount % 100 <> 0 then
    raise exception 'Use whole dollars only. Decimal deposits are not accepted.' using errcode='22023';
  end if;
  return new;
end $$;
revoke all on function demo_private.enforce_whole_dollar_deposit() from public,anon,authenticated,service_role;
create trigger whole_dollar_deposit_authorization before insert on demo_private.funding_authorizations
  for each row execute function demo_private.enforce_whole_dollar_deposit();
create trigger whole_dollar_funding_session before insert on public.demo_funding_sessions
  for each row execute function demo_private.enforce_whole_dollar_deposit();
commit;
