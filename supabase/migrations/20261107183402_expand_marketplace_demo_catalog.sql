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
  ('yeti-rambler-30-tumbler', 'YETI Rambler 30 oz Tumbler', 'Cabela’s®', 'Outdoor & Camping', '/catalog/marketplace/yeti-rambler-30-tumbler.webp', 5000, 150, 149, 'winner', 'yeti-rambler-30-tumbler'),
  ('coleman-sundome-4', 'Coleman Sundome 4-Person Tent', 'Cabela’s®', 'Outdoor & Camping', '/catalog/marketplace/coleman-sundome-4.webp', 10000, 300, 299, 'purchase_option', 'coleman-sundome-4'),
  ('penn-battle-iv-2500', 'PENN Battle IV 2500 Spinning Reel', 'Cabela’s®', 'Fishing', '/catalog/marketplace/penn-battle-iv-2500.webp', 15000, 450, 45, null, 'penn-battle-iv-2500'),
  ('vortex-diamondback-hd-10x42', 'Vortex Diamondback HD 10×42 Binoculars', 'Cabela’s®', 'Outdoor & Camping', '/catalog/marketplace/vortex-diamondback-hd-10x42.webp', 25000, 750, 749, 'winner', 'vortex-diamondback-hd-10x42'),
  ('kobalt-24v-leaf-blower', 'Kobalt 24V Cordless Leaf Blower', 'Lowe''s', 'Tools & DIY', '/catalog/marketplace/kobalt-24v-leaf-blower.webp', 12500, 375, 373, 'purchase_option', 'kobalt-24v-leaf-blower'),
  ('weber-original-kettle-22', 'Weber Original Kettle 22-inch Grill', 'Lowe''s', 'Home Essentials', '/catalog/marketplace/weber-original-kettle-22.webp', 15000, 450, 90, null, 'weber-original-kettle-22'),
  ('little-giant-flip-n-lite-m4', 'Little Giant Flip-N-Lite M4 Ladder', 'Lowe''s', 'Tools & DIY', '/catalog/marketplace/little-giant-flip-n-lite-m4.webp', 12500, 375, 374, 'winner', 'little-giant-flip-n-lite-m4'),
  ('milwaukee-packout-large-tool-box', 'Milwaukee PACKOUT Large Tool Box', 'The Home Depot', 'Tools & DIY', '/catalog/marketplace/milwaukee-packout-large-tool-box.webp', 10000, 300, 297, 'purchase_option', 'milwaukee-packout-large-tool-box'),
  ('ryobi-one-plus-inflator', 'RYOBI ONE+ Cordless High Pressure Inflator', 'The Home Depot', 'Tools & DIY', '/catalog/marketplace/ryobi-one-plus-inflator.webp', 5000, 150, 45, null, 'ryobi-one-plus-inflator'),
  ('ridgid-nxt-6-gallon-vac', 'RIDGID NXT 6-Gallon Wet/Dry Vac', 'The Home Depot', 'Tools & DIY', '/catalog/marketplace/ridgid-nxt-6-gallon-vac.webp', 10000, 300, 299, 'winner', 'ridgid-nxt-6-gallon-vac'),
  ('jbl-flip-7-speaker', 'JBL Flip 7 Portable Speaker', 'Best Buy', 'Electronics', '/catalog/marketplace/jbl-flip-7-speaker.webp', 15000, 450, 446, 'purchase_option', 'jbl-flip-7-speaker'),
  ('sony-wh-1000xm5-headphones', 'Sony WH-1000XM5 Wireless Headphones', 'Best Buy', 'Electronics', '/catalog/marketplace/sony-wh-1000xm5-headphones.webp', 35000, 1050, 420, null, 'sony-wh-1000xm5-headphones'),
  ('roku-streaming-stick-plus', 'Roku Streaming Stick Plus', 'Best Buy', 'Electronics', '/catalog/marketplace/roku-streaming-stick-plus.webp', 5000, 150, 149, 'winner', 'roku-streaming-stick-plus'),
  ('logitech-mx-master-3s', 'Logitech MX Master 3S Mouse', 'Best Buy', 'Electronics', '/catalog/marketplace/logitech-mx-master-3s.webp', 10000, 300, 299, 'purchase_option', 'logitech-mx-master-3s'),
  ('instax-mini-12-camera', 'Fujifilm instax mini 12 Instant Camera', 'Best Buy', 'Electronics', '/catalog/marketplace/instax-mini-12-camera.webp', 10000, 300, 150, null, 'instax-mini-12-camera'),
  ('ninja-af101-air-fryer', 'Ninja 4-Quart Air Fryer', 'Walmart', 'Kitchen', '/catalog/marketplace/ninja-af101-air-fryer.webp', 10000, 300, 299, 'winner', 'ninja-af101-air-fryer'),
  ('lodge-classic-10-inch-skillet', 'Lodge 10.25-inch Cast Iron Skillet', 'Walmart', 'Kitchen', '/catalog/marketplace/lodge-classic-10-inch-skillet.webp', 2500, 75, 73, 'purchase_option', 'lodge-classic-10-inch-skillet'),
  ('bissell-little-green-1400b', 'BISSELL Little Green Portable Cleaner', 'Walmart', 'Home Essentials', '/catalog/marketplace/bissell-little-green-1400b.webp', 12500, 375, 225, null, 'bissell-little-green-1400b'),
  ('wilson-evolution-basketball', 'Wilson Evolution Indoor Basketball', 'Dick''s Sporting Goods', 'Sports & Fitness', '/catalog/marketplace/wilson-evolution-basketball.webp', 10000, 300, 299, 'winner', 'wilson-evolution-basketball'),
  ('hydro-flask-flex-straw-32', 'Hydro Flask 32 oz Wide Mouth Bottle', 'Dick''s Sporting Goods', 'Sports & Fitness', '/catalog/marketplace/hydro-flask-flex-straw-32.webp', 5000, 150, 147, 'purchase_option', 'hydro-flask-flex-straw-32'),
  ('kong-classic-dog-toy', 'KONG Classic Dog Toy', 'PetSmart', 'Pet Supplies', '/catalog/marketplace/kong-classic-dog-toy.webp', 2500, 75, 52, null, 'kong-classic-dog-toy'),
  ('catit-flower-fountain', 'Catit Flower Fountain', 'PetSmart', 'Pet Supplies', '/catalog/marketplace/catit-flower-fountain.webp', 5000, 150, 149, 'winner', 'catit-flower-fountain'),
  ('plano-guide-series-tackle-bag', 'Plano Guide Series 2.0 Tackle Bag', 'Bass Pro Shops®', 'Fishing', '/catalog/marketplace/plano-guide-series-tackle-bag.webp', 15000, 450, 446, 'purchase_option', 'plano-guide-series-tackle-bag'),
  ('kitchenaid-artisan-5qt-mixer', 'KitchenAid Artisan 5-Quart Stand Mixer', 'Target', 'Kitchen', '/catalog/marketplace/kitchenaid-artisan-5qt-mixer.webp', 50000, 1500, 1200, null, 'kitchenaid-artisan-5qt-mixer'),
  ('cuisinart-ice-21-ice-cream-maker', 'Cuisinart Frozen Yogurt & Ice Cream Maker', 'Target', 'Kitchen', '/catalog/marketplace/cuisinart-ice-21-ice-cream-maker.webp', 7500, 225, 224, 'winner', 'cuisinart-ice-21-ice-cream-maker'),
  ('cabelas-75-gift-card', '$75 Cabela’s® Gift Card', 'Cabela’s®', 'Sporting Goods', '/catalog/partner-cards/cabelas.webp', 7500, 225, 224, 'winner', 'cabelas'),
  ('cabelas-50-gift-card', '$50 Cabela’s® Gift Card', 'Cabela’s®', 'Sporting Goods', '/catalog/partner-cards/cabelas.webp', 5000, 150, 149, 'purchase_option', 'cabelas'),
  ('cabelas-25-gift-card', '$25 Cabela’s® Gift Card', 'Cabela’s®', 'Sporting Goods', '/catalog/partner-cards/cabelas.webp', 2500, 75, 74, 'winner', 'cabelas'),
  ('bass-pro-shops-75-gift-card', '$75 Bass Pro Shops® Gift Card', 'Bass Pro Shops®', 'Sporting Goods', '/catalog/partner-cards/bassproshops.webp', 7500, 225, 224, 'purchase_option', 'bass-pro-shops'),
  ('bass-pro-shops-50-gift-card', '$50 Bass Pro Shops® Gift Card', 'Bass Pro Shops®', 'Sporting Goods', '/catalog/partner-cards/bassproshops.webp', 5000, 150, 149, 'winner', 'bass-pro-shops'),
  ('bass-pro-shops-25-gift-card', '$25 Bass Pro Shops® Gift Card', 'Bass Pro Shops®', 'Sporting Goods', '/catalog/partner-cards/bassproshops.webp', 2500, 75, 74, 'purchase_option', 'bass-pro-shops'),
  ('lowes-75-gift-card', '$75 Lowe''s Gift Card', 'Lowe''s', 'Home Furnishings & Improvement', '/catalog/partner-cards/lowes.webp', 7500, 225, 224, 'winner', 'lowes'),
  ('lowes-50-gift-card', '$50 Lowe''s Gift Card', 'Lowe''s', 'Home Furnishings & Improvement', '/catalog/partner-cards/lowes.webp', 5000, 150, 149, 'purchase_option', 'lowes'),
  ('lowes-25-gift-card', '$25 Lowe''s Gift Card', 'Lowe''s', 'Home Furnishings & Improvement', '/catalog/partner-cards/lowes.webp', 2500, 75, 74, 'winner', 'lowes'),
  ('target-75-gift-card', '$75 Target Gift Card', 'Target', 'General Merchandise', '/catalog/partner-cards/target.webp', 7500, 225, 224, 'purchase_option', 'target'),
  ('target-50-gift-card', '$50 Target Gift Card', 'Target', 'General Merchandise', '/catalog/partner-cards/target.webp', 5000, 150, 149, 'winner', 'target'),
  ('target-25-gift-card', '$25 Target Gift Card', 'Target', 'General Merchandise', '/catalog/partner-cards/target.webp', 2500, 75, 74, 'purchase_option', 'target'),
  ('best-buy-75-gift-card', '$75 Best Buy Gift Card', 'Best Buy', 'Electronics', '/catalog/partner-cards/bestbuy.webp', 7500, 225, 224, 'winner', 'best-buy'),
  ('best-buy-50-gift-card', '$50 Best Buy Gift Card', 'Best Buy', 'Electronics', '/catalog/partner-cards/bestbuy.webp', 5000, 150, 149, 'purchase_option', 'best-buy'),
  ('best-buy-25-gift-card', '$25 Best Buy Gift Card', 'Best Buy', 'Electronics', '/catalog/partner-cards/bestbuy.webp', 2500, 75, 74, 'winner', 'best-buy'),
  ('dicks-sporting-goods-75-gift-card', '$75 Dick''s Sporting Goods Gift Card', 'Dick''s Sporting Goods', 'Sporting Goods', '/catalog/partner-cards/dickssportinggoods.webp', 7500, 225, 224, 'purchase_option', 'dicks-sporting-goods'),
  ('dicks-sporting-goods-50-gift-card', '$50 Dick''s Sporting Goods Gift Card', 'Dick''s Sporting Goods', 'Sporting Goods', '/catalog/partner-cards/dickssportinggoods.webp', 5000, 150, 149, 'winner', 'dicks-sporting-goods'),
  ('dicks-sporting-goods-25-gift-card', '$25 Dick''s Sporting Goods Gift Card', 'Dick''s Sporting Goods', 'Sporting Goods', '/catalog/partner-cards/dickssportinggoods.webp', 2500, 75, 74, 'purchase_option', 'dicks-sporting-goods'),
  ('rei-75-gift-card', '$75 REI Gift Card', 'REI', 'Sporting Goods', '/catalog/partner-cards/rei.webp', 7500, 225, 224, 'winner', 'rei'),
  ('rei-50-gift-card', '$50 REI Gift Card', 'REI', 'Sporting Goods', '/catalog/partner-cards/rei.webp', 5000, 150, 149, 'purchase_option', 'rei'),
  ('rei-25-gift-card', '$25 REI Gift Card', 'REI', 'Sporting Goods', '/catalog/partner-cards/rei.webp', 2500, 75, 74, 'winner', 'rei'),
  ('barnes-noble-75-gift-card', '$75 Barnes & Noble Gift Card', 'Barnes & Noble', 'Specialty Retail', '/catalog/partner-cards/barnesnoble.webp', 7500, 225, 224, 'purchase_option', 'barnes-noble'),
  ('barnes-noble-50-gift-card', '$50 Barnes & Noble Gift Card', 'Barnes & Noble', 'Specialty Retail', '/catalog/partner-cards/barnesnoble.webp', 5000, 150, 149, 'winner', 'barnes-noble'),
  ('barnes-noble-25-gift-card', '$25 Barnes & Noble Gift Card', 'Barnes & Noble', 'Specialty Retail', '/catalog/partner-cards/barnesnoble.webp', 2500, 75, 74, 'purchase_option', 'barnes-noble'),
  ('michaels-75-gift-card', '$75 Michaels Gift Card', 'Michaels', 'Specialty Retail', '/catalog/partner-cards/michaels.webp', 7500, 225, 224, 'winner', 'michaels'),
  ('michaels-50-gift-card', '$50 Michaels Gift Card', 'Michaels', 'Specialty Retail', '/catalog/partner-cards/michaels.webp', 5000, 150, 149, 'purchase_option', 'michaels'),
  ('michaels-25-gift-card', '$25 Michaels Gift Card', 'Michaels', 'Specialty Retail', '/catalog/partner-cards/michaels.webp', 2500, 75, 74, 'winner', 'michaels'),
  ('ace-hardware-75-gift-card', '$75 Ace Hardware Gift Card', 'Ace Hardware', 'Home Furnishings & Improvement', '/catalog/partner-cards/acehardware.webp', 7500, 225, 224, 'purchase_option', 'ace-hardware'),
  ('ace-hardware-50-gift-card', '$50 Ace Hardware Gift Card', 'Ace Hardware', 'Home Furnishings & Improvement', '/catalog/partner-cards/acehardware.webp', 5000, 150, 149, 'winner', 'ace-hardware'),
  ('ace-hardware-25-gift-card', '$25 Ace Hardware Gift Card', 'Ace Hardware', 'Home Furnishings & Improvement', '/catalog/partner-cards/acehardware.webp', 2500, 75, 74, 'purchase_option', 'ace-hardware');

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
