-- Dunkin' is a third scripted, repeatable winner in the development/test
-- showcase. Preserve every historical entry, option, closure, and ledger row.
-- A replay always advertises one fictional slot, like TV and Walmart.
begin;

alter table demo_private.preview_entry_offerings
  drop constraint preview_repeatable_scenario_allowlist;
alter table demo_private.preview_entry_offerings
  add constraint preview_repeatable_scenario_allowlist check (
    not repeatable_scenario
    or (slug in ('samsung-m70h-tv', 'walmart-100-gift-card', 'dunkin-25-gift-card')
      and forced_outcome = 'winner')
    or (slug in ('nike-court-shot-shoes', 'babys-essentials-bundle')
      and forced_outcome = 'not_selected')
  );

do $$
begin
  if exists (select 1 from public.entry_requests
      where offering_slug = 'dunkin-25-gift-card' and status = 'validating') then
    raise exception 'A Dunkin entry is still being confirmed; retry this migration later'
      using errcode = 'P0001';
  end if;

  update demo_private.preview_entry_offerings
  set sample_entries = capacity - 1,
      forced_outcome = 'winner',
      repeatable_scenario = true,
      updated_at = now()
  where slug = 'dunkin-25-gift-card'
    and active and capacity = 75 and value_cents = 2500
    and entry_price_cents = 100
    and forced_outcome = 'active' and not repeatable_scenario;

  if not found then
    raise exception 'Expected the original $25 Dunkin demo offering'
      using errcode = 'P0001';
  end if;
end;
$$;

-- The UI only offers one ticket; enforce that on the private request path too.
create function demo_private.limit_dunkin_showcase_request() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.offering_slug = 'dunkin-25-gift-card' and new.requested_quantity <> 1 then
    raise exception 'Only one Dunkin demo entry is available at a time'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function demo_private.limit_dunkin_showcase_request()
  from public, anon, authenticated, service_role;
create trigger limit_dunkin_showcase_request
  before insert on public.entry_requests
  for each row execute function demo_private.limit_dunkin_showcase_request();

commit;
