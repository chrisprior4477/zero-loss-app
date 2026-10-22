-- Append only: preserve existing offers, customer entries and ledger history.
-- These are simulated catalog/pool snapshots using the existing preview flow.
begin;
insert into demo_private.preview_entry_offerings
  (slug, title, retailer, category, image_path, value_cents, entry_price_cents,
   capacity, sample_entries, forced_outcome, repeatable_scenario)
values
  ('airpods-pro', 'Apple AirPods Pro 3', 'Best Buy', 'Electronics',
   '/catalog/airpods-pro-3.jpg', 25000, 100, 750, 748, 'active', false),
  ('nintendo-switch', 'Nintendo Switch – OLED Model', 'Best Buy', 'Gaming',
   '/catalog/nintendo-switch-oled.jpg', 40000, 100, 1200, 1194, 'active', false),
  ('publix-100-gift-card-ending-soon', '$100 Publix Gift Card', 'Publix', 'Groceries',
   '/catalog/publix-100-gift-card-cutout-final.png', 10000, 100, 300, 289, 'active', false)
on conflict (slug) do nothing;
commit;
