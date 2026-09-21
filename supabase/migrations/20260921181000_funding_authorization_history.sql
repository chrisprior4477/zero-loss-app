begin;
create function demo_private.guard_funding_authorization_history() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and old.consumed_by is null and new.consumed_by is not null
    and (to_jsonb(new)-'consumed_by')=(to_jsonb(old)-'consumed_by') then return new; end if;
  raise exception 'Funding authorization history is immutable' using errcode='42501';
end $$;
revoke all on function demo_private.guard_funding_authorization_history() from public,anon,authenticated,service_role;
create trigger funding_authorization_history before update or delete on demo_private.funding_authorizations
  for each row execute function demo_private.guard_funding_authorization_history();
create trigger funding_authorization_no_truncate before truncate on demo_private.funding_authorizations
  for each statement execute function demo_private.guard_funding_authorization_history();
commit;
