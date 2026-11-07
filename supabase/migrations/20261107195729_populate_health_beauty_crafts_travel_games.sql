-- Append only the newly published demo offerings. Completed entries, existing
-- gift-card denominations and customer outcomes retain their original identity.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $$ begin
  if not coalesce((select environment = 'development-test' and (
    preview_entries_enabled or (not enabled and not preview_provisioning_enabled
      and not exists(select 1 from public.customers)
      and not exists(select 1 from public.ledger_entries))
  ) from demo_private.funding_config where singleton), false) then
    raise exception 'Marketplace expansion requires the demo environment' using errcode = '42501';
  end if;
end $$;

create temporary table new_catalog_rows (
  slug text primary key, title text, retailer text, category text, image_path text,
  value_cents integer, capacity integer, sample_entries integer, closing_outcome text, brand_slug text
) on commit drop;
insert into new_catalog_rows values
  ('nature-made-vitamin-c-tablets', 'Nature Made Vitamin C 500 mg Tablets', 'CVS', 'Health', '/catalog/marketplace/nature-made-vitamin-c-tablets.webp', 2500, 75, 74, 'winner', 'nature-made-vitamin-c-tablets'),
  ('ascent-chocolate-whey', 'Ascent Chocolate Whey Protein Powder', 'Target', 'Health', '/catalog/marketplace/ascent-chocolate-whey.webp', 5000, 150, 148, 'purchase_option', 'ascent-chocolate-whey'),
  ('blenderbottle-classic-shaker', 'BlenderBottle Classic Shaker', 'Dick''s Sporting Goods', 'Health', '/catalog/marketplace/blenderbottle-classic-shaker.webp', 2500, 75, 7, null, 'blenderbottle-classic-shaker'),
  ('milani-color-fetish-lipstick', 'Milani Color Fetish Matte Lipstick', 'Ulta', 'Beauty', '/catalog/marketplace/milani-color-fetish-lipstick.webp', 2500, 75, 74, 'winner', 'milani-color-fetish-lipstick'),
  ('milani-stay-put-eyeliner', 'Milani Stay Put Eyeliner in After Dark', 'Walgreens', 'Beauty', '/catalog/marketplace/milani-stay-put-eyeliner.webp', 2500, 75, 72, 'purchase_option', 'milani-stay-put-eyeliner'),
  ('milani-baked-blush', 'Milani Baked Blush', 'Target', 'Beauty', '/catalog/marketplace/milani-baked-blush.webp', 2500, 75, 34, null, 'milani-baked-blush'),
  ('ooly-ocean-watercolor-kit', 'OOLY Ocean Fun Watercolor Painting Kit', 'Michaels', 'Arts & Crafts', '/catalog/marketplace/ooly-ocean-watercolor-kit.webp', 2500, 75, 74, 'winner', 'ooly-ocean-watercolor-kit'),
  ('ooly-mechanical-colored-pencils', 'OOLY Color Together 18 Mechanical Colored Pencils', 'Michaels', 'Arts & Crafts', '/catalog/marketplace/ooly-mechanical-colored-pencils.webp', 2500, 75, 71, 'purchase_option', 'ooly-mechanical-colored-pencils'),
  ('ooly-turbo-tabby-clay-kit', 'OOLY Turbo Tabby Air-Dry Clay Car Kit', 'Michaels', 'Arts & Crafts', '/catalog/marketplace/ooly-turbo-tabby-clay-kit.webp', 2500, 75, 49, null, 'ooly-turbo-tabby-clay-kit'),
  ('corkcicle-mickey-bottle-sling', 'Corkcicle Mickey Mouse Water Bottle Sling', 'Nordstrom', 'Travel', '/catalog/marketplace/corkcicle-mickey-bottle-sling.webp', 5000, 150, 149, 'winner', 'corkcicle-mickey-bottle-sling'),
  ('timbuk2-division-backpack', 'Timbuk2 Water Resistant Division Backpack', 'REI', 'Travel', '/catalog/marketplace/timbuk2-division-backpack.webp', 15000, 450, 448, 'purchase_option', 'timbuk2-division-backpack'),
  ('stanley-cafe-to-go-12', 'Stanley Café-To-Go 12 oz Travel Mug', 'Dick''s Sporting Goods', 'Travel', '/catalog/marketplace/stanley-cafe-to-go-12.webp', 2500, 75, 22, null, 'stanley-cafe-to-go-12'),
  ('exploding-kittens-original', 'Exploding Kittens Original Edition Card Game', 'Target', 'Games & Puzzles', '/catalog/marketplace/exploding-kittens-original.webp', 2500, 75, 74, 'winner', 'exploding-kittens-original'),
  ('happy-salmon-card-game', 'Happy Salmon Card Game', 'Target', 'Games & Puzzles', '/catalog/marketplace/happy-salmon-card-game.webp', 2500, 75, 72, 'purchase_option', 'happy-salmon-card-game'),
  ('a-little-wordy-game', 'A Little Wordy Word Game', 'Barnes & Noble', 'Games & Puzzles', '/catalog/marketplace/a-little-wordy-game.webp', 2500, 75, 60, null, 'a-little-wordy-game'),
  ('sephora-75-gift-card', '$75 Sephora Gift Card', 'Sephora', 'Specialty Retail', '/catalog/partner-cards/sephora.webp', 7500, 225, 224, 'winner', 'sephora'),
  ('sephora-50-gift-card', '$50 Sephora Gift Card', 'Sephora', 'Specialty Retail', '/catalog/partner-cards/sephora.webp', 5000, 150, 149, 'purchase_option', 'sephora'),
  ('sephora-25-gift-card', '$25 Sephora Gift Card', 'Sephora', 'Specialty Retail', '/catalog/partner-cards/sephora.webp', 2500, 75, 74, 'winner', 'sephora'),
  ('ulta-75-gift-card', '$75 Ulta Gift Card', 'Ulta', 'Specialty Retail', '/catalog/partner-cards/ulta.webp', 7500, 225, 224, 'purchase_option', 'ulta'),
  ('ulta-50-gift-card', '$50 Ulta Gift Card', 'Ulta', 'Specialty Retail', '/catalog/partner-cards/ulta.webp', 5000, 150, 149, 'winner', 'ulta'),
  ('ulta-25-gift-card', '$25 Ulta Gift Card', 'Ulta', 'Specialty Retail', '/catalog/partner-cards/ulta.webp', 2500, 75, 74, 'purchase_option', 'ulta'),
  ('the-vitamin-shoppe-75-gift-card', '$75 The Vitamin Shoppe® Gift Card', 'The Vitamin Shoppe®', 'Specialty Retail', '/catalog/partner-cards/thevitaminshoppe.webp', 7500, 225, 224, 'winner', 'the-vitamin-shoppe'),
  ('the-vitamin-shoppe-50-gift-card', '$50 The Vitamin Shoppe® Gift Card', 'The Vitamin Shoppe®', 'Specialty Retail', '/catalog/partner-cards/thevitaminshoppe.webp', 5000, 150, 149, 'purchase_option', 'the-vitamin-shoppe'),
  ('the-vitamin-shoppe-25-gift-card', '$25 The Vitamin Shoppe® Gift Card', 'The Vitamin Shoppe®', 'Specialty Retail', '/catalog/partner-cards/thevitaminshoppe.webp', 2500, 75, 74, 'winner', 'the-vitamin-shoppe'),
  ('walgreens-75-gift-card', '$75 Walgreens Gift Card', 'Walgreens', 'Health & Essentials', '/catalog/partner-cards/walgreens.webp', 7500, 225, 224, 'purchase_option', 'walgreens'),
  ('walgreens-50-gift-card', '$50 Walgreens Gift Card', 'Walgreens', 'Health & Essentials', '/catalog/partner-cards/walgreens.webp', 5000, 150, 149, 'winner', 'walgreens'),
  ('walgreens-25-gift-card', '$25 Walgreens Gift Card', 'Walgreens', 'Health & Essentials', '/catalog/partner-cards/walgreens.webp', 2500, 75, 74, 'purchase_option', 'walgreens'),
  ('gamestop-75-gift-card', '$75 Gamestop® Gift Card', 'Gamestop®', 'Digital & Gaming', '/catalog/partner-cards/gamestop.webp', 7500, 225, 224, 'winner', 'gamestop'),
  ('gamestop-50-gift-card', '$50 Gamestop® Gift Card', 'Gamestop®', 'Digital & Gaming', '/catalog/partner-cards/gamestop.webp', 5000, 150, 149, 'purchase_option', 'gamestop'),
  ('gamestop-25-gift-card', '$25 Gamestop® Gift Card', 'Gamestop®', 'Digital & Gaming', '/catalog/partner-cards/gamestop.webp', 2500, 75, 74, 'winner', 'gamestop'),
  ('macys-75-gift-card', '$75 Macy''s Gift Card', 'Macy''s', 'Clothing & Accessories', '/catalog/partner-cards/macys.webp', 7500, 225, 224, 'purchase_option', 'macys'),
  ('macys-50-gift-card', '$50 Macy''s Gift Card', 'Macy''s', 'Clothing & Accessories', '/catalog/partner-cards/macys.webp', 5000, 150, 149, 'winner', 'macys'),
  ('macys-25-gift-card', '$25 Macy''s Gift Card', 'Macy''s', 'Clothing & Accessories', '/catalog/partner-cards/macys.webp', 2500, 75, 74, 'purchase_option', 'macys'),
  ('kohls-75-gift-card', '$75 Kohl''s Gift Card', 'Kohl''s', 'Clothing & Accessories', '/catalog/partner-cards/kohls.webp', 7500, 225, 224, 'winner', 'kohls'),
  ('kohls-50-gift-card', '$50 Kohl''s Gift Card', 'Kohl''s', 'Clothing & Accessories', '/catalog/partner-cards/kohls.webp', 5000, 150, 149, 'purchase_option', 'kohls'),
  ('kohls-25-gift-card', '$25 Kohl''s Gift Card', 'Kohl''s', 'Clothing & Accessories', '/catalog/partner-cards/kohls.webp', 2500, 75, 74, 'winner', 'kohls'),
  ('nordstrom-75-gift-card', '$75 Nordstrom Gift Card', 'Nordstrom', 'Clothing & Accessories', '/catalog/partner-cards/nordstrom.webp', 7500, 225, 224, 'purchase_option', 'nordstrom'),
  ('nordstrom-50-gift-card', '$50 Nordstrom Gift Card', 'Nordstrom', 'Clothing & Accessories', '/catalog/partner-cards/nordstrom.webp', 5000, 150, 149, 'winner', 'nordstrom'),
  ('nordstrom-25-gift-card', '$25 Nordstrom Gift Card', 'Nordstrom', 'Clothing & Accessories', '/catalog/partner-cards/nordstrom.webp', 2500, 75, 74, 'purchase_option', 'nordstrom'),
  ('old-navy-75-gift-card', '$75 Old Navy Gift Card', 'Old Navy', 'Clothing & Accessories', '/catalog/partner-cards/oldnavy.webp', 7500, 225, 224, 'winner', 'old-navy'),
  ('old-navy-50-gift-card', '$50 Old Navy Gift Card', 'Old Navy', 'Clothing & Accessories', '/catalog/partner-cards/oldnavy.webp', 5000, 150, 149, 'purchase_option', 'old-navy'),
  ('old-navy-25-gift-card', '$25 Old Navy Gift Card', 'Old Navy', 'Clothing & Accessories', '/catalog/partner-cards/oldnavy.webp', 2500, 75, 74, 'winner', 'old-navy'),
  ('bath-body-works-75-gift-card', '$75 Bath & Body Works Gift Card', 'Bath & Body Works', 'Specialty Retail', '/catalog/partner-cards/bathbodyworks.webp', 7500, 225, 224, 'purchase_option', 'bath-body-works'),
  ('bath-body-works-50-gift-card', '$50 Bath & Body Works Gift Card', 'Bath & Body Works', 'Specialty Retail', '/catalog/partner-cards/bathbodyworks.webp', 5000, 150, 149, 'winner', 'bath-body-works'),
  ('bath-body-works-25-gift-card', '$25 Bath & Body Works Gift Card', 'Bath & Body Works', 'Specialty Retail', '/catalog/partner-cards/bathbodyworks.webp', 2500, 75, 74, 'purchase_option', 'bath-body-works');

insert into demo_private.preview_entry_offerings
  (slug,title,retailer,category,image_path,value_cents,entry_price_cents,capacity,
   sample_entries,repeatable_scenario,forced_outcome,active)
select slug,title,retailer,category,image_path,value_cents,100,capacity,
  sample_entries,false,'active',true from new_catalog_rows
on conflict (slug) do nothing;

insert into demo_private.preview_popular_reward_scenarios (offering_slug,brand_slug,closing_outcome)
select slug,brand_slug,closing_outcome from new_catalog_rows where closing_outcome is not null
on conflict (offering_slug) do nothing;
do $$ begin
  if exists (select 1 from new_catalog_rows n
    left join demo_private.preview_entry_offerings o using (slug)
    left join demo_private.preview_popular_reward_scenarios s on s.offering_slug=n.slug
    where o.slug is null or (o.title,o.retailer,o.category,o.image_path,o.value_cents,o.entry_price_cents,o.capacity,o.forced_outcome,o.repeatable_scenario)
      is distinct from (n.title,n.retailer,n.category,n.image_path,n.value_cents,100,n.capacity,'active'::text,false)
      or s.closing_outcome is distinct from n.closing_outcome) then
    raise exception 'Expansion metadata conflicts with an existing demo offering';
  end if;
end $$;
commit;
