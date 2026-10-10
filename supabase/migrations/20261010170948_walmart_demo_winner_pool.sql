-- Make the $100 Walmart card a second repeatable, simulated winner showcase.
-- Existing customer entries and the wallet ledger remain untouched. This
-- changes only the fictional catalog slots and the outcome of future entries.
begin;

alter table demo_private.preview_entry_offerings
  drop constraint preview_repeatable_scenario_allowlist;
alter table demo_private.preview_entry_offerings
  add constraint preview_repeatable_scenario_allowlist check (
    not repeatable_scenario
    or (slug in ('samsung-m70h-tv', 'walmart-100-gift-card') and forced_outcome = 'winner')
    or (slug in ('nike-court-shot-shoes', 'babys-essentials-bundle') and forced_outcome = 'not_selected')
  );

do $$
begin
  update demo_private.preview_entry_offerings
  set sample_entries = capacity - 1,
      forced_outcome = 'winner',
      repeatable_scenario = true,
      updated_at = now()
  where slug = 'walmart-100-gift-card'
    and active
    and capacity = 300
    and value_cents = 10000
    and entry_price_cents = 100
    and forced_outcome = 'active'
    and not repeatable_scenario;

  if not found then
    raise exception 'Expected the open $100 Walmart demo offering' using errcode = 'P0001';
  end if;
end;
$$;

commit;
