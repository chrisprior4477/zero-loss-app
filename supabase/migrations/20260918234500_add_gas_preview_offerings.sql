begin;

insert into demo_private.preview_entry_offerings (
  slug,
  title,
  retailer,
  category,
  image_path,
  value_cents,
  entry_price_cents,
  capacity,
  forced_outcome,
  active,
  updated_at
)
values
  (
    'bp-100-gift-card',
    '$100 BP Fuel & Convenience Gift Card',
    'BP',
    'Fuel & Convenience',
    '/catalog/gas/bp-100-gift-card.svg',
    10000,
    100,
    300,
    'active',
    true,
    clock_timestamp()
  ),
  (
    'pilot-flying-j-150-gift-card',
    '$150 Pilot Flying J Fuel & Travel Gift Card',
    'Pilot Flying J',
    'Fuel & Convenience',
    '/catalog/gas/pilot-flying-j-150-gift-card.svg',
    15000,
    100,
    450,
    'active',
    true,
    clock_timestamp()
  ),
  (
    'sheetz-75-gift-card',
    '$75 Sheetz Fuel & Convenience Gift Card',
    'Sheetz',
    'Fuel & Convenience',
    '/catalog/gas/sheetz-75-gift-card.svg',
    7500,
    100,
    225,
    'active',
    true,
    clock_timestamp()
  ),
  (
    'speedway-50-gift-card',
    '$50 Speedway Fuel & Convenience Gift Card',
    'Speedway',
    'Fuel & Convenience',
    '/catalog/gas/speedway-50-gift-card.svg',
    5000,
    100,
    150,
    'active',
    true,
    clock_timestamp()
  )
on conflict (slug) do update set
  title = excluded.title,
  retailer = excluded.retailer,
  category = excluded.category,
  image_path = excluded.image_path,
  value_cents = excluded.value_cents,
  entry_price_cents = excluded.entry_price_cents,
  capacity = excluded.capacity,
  forced_outcome = excluded.forced_outcome,
  active = excluded.active,
  updated_at = excluded.updated_at;

commit;
