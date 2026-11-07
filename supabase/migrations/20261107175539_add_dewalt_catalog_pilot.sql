-- One additive, owner-approved product pilot. All account actions continue
-- through the existing preview entry, ledger, completion, and reward writers.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$ begin
  if not coalesce((select environment = 'development-test' and (
      preview_entries_enabled or (
        not enabled and not preview_provisioning_enabled
        and not exists (select 1 from public.customers)
        and not exists (select 1 from public.ledger_entries)
      )) from demo_private.funding_config where singleton), false) then
    raise exception 'Catalog pilot is available only in the demo environment' using errcode = '42501';
  end if;
end $$;

with inserted as (
  insert into demo_private.preview_entry_offerings
    (slug, title, retailer, category, image_path, value_cents, entry_price_cents,
     capacity, sample_entries, repeatable_scenario, forced_outcome, active)
  values ('dewalt-20v-drill-kit', 'DEWALT 20V MAX Cordless Drill Kit',
    'The Home Depot', 'Home Essentials', '/catalog/dewalt-20v-drill-kit-cutout.png',
    15000, 100, 450, 448, false, 'active', true)
  on conflict (slug) do nothing
  returning slug
)
insert into demo_private.preview_popular_reward_scenarios
  (offering_slug, brand_slug, closing_outcome)
select slug, 'home-depot', 'purchase_option' from inserted
on conflict (offering_slug) do nothing;

-- A replay must never recalibrate an offer already used by a customer.
do $$ begin
  if not exists (
    select 1 from demo_private.preview_entry_offerings o
    join demo_private.preview_popular_reward_scenarios s on s.offering_slug = o.slug
    where o.slug = 'dewalt-20v-drill-kit' and o.value_cents = 15000
      and o.entry_price_cents = 100 and o.capacity = 450
      and not o.repeatable_scenario and o.forced_outcome = 'active'
      and s.closing_outcome = 'purchase_option'
  ) then raise exception 'Catalog pilot conflicts with an existing offer'; end if;
end $$;
commit;
