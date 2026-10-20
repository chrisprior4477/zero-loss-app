-- Preview entry lifecycle. Installation is inert: an operator must load the
-- preview catalog and enable entries for the exact development/test issuer.
begin;

alter table demo_private.funding_config
  add column preview_entries_enabled boolean not null default false;

alter table demo_private.funding_config
  add constraint preview_entries_environment_check check (
    not preview_entries_enabled
    or (
      enabled
      and preview_provisioning_enabled
      and environment = 'development-test'
      and preview_issuer ~ '^https://[a-z0-9]+[.]supabase[.]co/auth/v1$'
    )
  );

create table demo_private.preview_entry_offerings (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 240),
  retailer text not null check (length(retailer) between 1 and 160),
  category text not null check (length(category) between 1 and 160),
  image_path text not null check (image_path ~ '^/'),
  value_cents integer not null check (value_cents > 0),
  entry_price_cents integer not null check (entry_price_cents > 0),
  capacity integer not null check (capacity > 0),
  forced_outcome text not null default 'active'
    check (forced_outcome in ('active','winner','not_selected')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table demo_private.preview_entry_offerings enable row level security;
revoke all on demo_private.preview_entry_offerings from public, anon, authenticated, service_role;

-- Immutable catalog snapshot from the original preview-entry commit 057825a.
-- This replaces the undocumented manual import needed by later migrations.
-- Funding/entry enablement remains disabled; no customer or ledger rows are seeded.
insert into demo_private.preview_entry_offerings
  (slug, title, retailer, category, image_path, value_cents, entry_price_cents, capacity, forced_outcome)
values
  ('samsung-m70h-tv', 'Samsung 50" M70H Mini LED 4K Smart TV', 'Best Buy', 'Electronics', '/catalog/samsung-m70h-tv-real.png', 40000, 100, 1200, 'winner'),
  ('nike-court-shot-shoes', 'Nike Men''s Court Shot Shoes', 'Dick''s Sporting Goods', 'Shoes & Apparel', '/catalog/nike-court-shot-side-cutout.png', 7500, 100, 225, 'not_selected'),
  ('babys-essentials-bundle', 'Baby''s Essentials Bundle', 'Walmart', 'Baby Essentials', '/catalog/babys-essentials-bundle-angled-real.png', 10000, 100, 300, 'not_selected'),
  ('playstation-5-slim', 'PlayStation 5 Slim Model', 'Best Buy', 'Gaming', '/dollar-choice-gaming.png', 65000, 100, 1950, 'active'),
  ('publix-100-gift-card', '$100 Publix Gift Card', 'Publix', 'Groceries', '/catalog/publix-100-gift-card-cutout-final.png', 10000, 100, 300, 'active'),
  ('dyson-v8-cordless-vacuum', 'Dyson V8 Cordless Pet Vacuum', 'Lowe''s', 'Home Essentials', '/catalog/dyson-v8-diagonal-real.png', 35000, 100, 1050, 'active'),
  ('lg-oled-c6-65-tv', '65-inch LG OLED evo AI C6 4K Smart TV', 'Best Buy', 'Electronics', '/dollar-choice-lg-oled-c6.png', 270000, 100, 8100, 'active'),
  ('dunkin-25-gift-card', '$25 Dunkin'' Gift Card', 'Dunkin''', 'Dining & Coffee', '/catalog/dunkin-25-gift-card.svg', 2500, 100, 75, 'active'),
  ('homegoods-75-gift-card', '$75 HomeGoods Gift Card', 'HomeGoods', 'Home Essentials', '/catalog/homegoods-75-gift-card.svg', 7500, 100, 225, 'active'),
  ('lowes-150-gift-card', '$150 Lowe''s Appliance Gift Card', 'Lowe''s', 'Home Essentials', '/catalog/lowes-150-gift-card.svg', 15000, 200, 450, 'active'),
  ('home-style-50-gift-card-bundle', '$50 Bed Bath & Beyond + Wayfair Bundle', 'Bed Bath & Beyond + Wayfair', 'Gift Cards', '/catalog/home-style-50-gift-card-bundle.svg', 5000, 100, 150, 'active'),
  ('best-buy-100-gift-card', '$100 Best Buy Gift Card', 'Best Buy', 'Electronics', '/catalog/best-buy-100-gift-card.svg', 10000, 100, 300, 'active'),
  ('netflix-25-gift-card', '$25 Netflix Gift Card', 'Netflix', 'Movie Night', '/catalog/netflix-25-gift-card.svg', 2500, 100, 75, 'active'),
  ('amazon-100-gift-card', '$100 Amazon Gift Card', 'Amazon', 'Shopping', '/catalog/reward-cards/amazon-card-display.png', 10000, 100, 300, 'active'),
  ('amazon-75-gift-card', '$75 Amazon Gift Card', 'Amazon', 'Shopping', '/catalog/reward-cards/amazon-card-display.png', 7500, 100, 225, 'active'),
  ('amazon-50-gift-card', '$50 Amazon Gift Card', 'Amazon', 'Shopping', '/catalog/reward-cards/amazon-card-display.png', 5000, 100, 150, 'active'),
  ('amazon-25-gift-card', '$25 Amazon Gift Card', 'Amazon', 'Shopping', '/catalog/reward-cards/amazon-card-display.png', 2500, 100, 75, 'active'),
  ('walmart-100-gift-card', '$100 Walmart Gift Card', 'Walmart', 'Everyday Shopping', '/catalog/reward-cards/walmart-card-display.png', 10000, 100, 300, 'active'),
  ('walmart-75-gift-card', '$75 Walmart Gift Card', 'Walmart', 'Everyday Shopping', '/catalog/reward-cards/walmart-card-display.png', 7500, 100, 225, 'active'),
  ('walmart-50-gift-card', '$50 Walmart Gift Card', 'Walmart', 'Everyday Shopping', '/catalog/reward-cards/walmart-card-display.png', 5000, 100, 150, 'active'),
  ('walmart-25-gift-card', '$25 Walmart Gift Card', 'Walmart', 'Everyday Shopping', '/catalog/reward-cards/walmart-card-display.png', 2500, 100, 75, 'active'),
  ('starbucks-100-gift-card', '$100 Starbucks Gift Card', 'Starbucks', 'Dining & Coffee', '/catalog/reward-cards/starbucks-card-final.png', 10000, 100, 300, 'active'),
  ('starbucks-75-gift-card', '$75 Starbucks Gift Card', 'Starbucks', 'Dining & Coffee', '/catalog/reward-cards/starbucks-card-final.png', 7500, 100, 225, 'active'),
  ('starbucks-50-gift-card', '$50 Starbucks Gift Card', 'Starbucks', 'Dining & Coffee', '/catalog/reward-cards/starbucks-card-final.png', 5000, 100, 150, 'active'),
  ('starbucks-25-gift-card', '$25 Starbucks Gift Card', 'Starbucks', 'Dining & Coffee', '/catalog/reward-cards/starbucks-card-final.png', 2500, 100, 75, 'active'),
  ('doordash-100-gift-card', '$100 DoorDash Gift Card', 'DoorDash', 'Dining & Delivery', '/catalog/reward-cards/doordash-card-red.svg', 10000, 100, 300, 'active'),
  ('doordash-75-gift-card', '$75 DoorDash Gift Card', 'DoorDash', 'Dining & Delivery', '/catalog/reward-cards/doordash-card-red.svg', 7500, 100, 225, 'active'),
  ('doordash-50-gift-card', '$50 DoorDash Gift Card', 'DoorDash', 'Dining & Delivery', '/catalog/reward-cards/doordash-card-red.svg', 5000, 100, 150, 'active'),
  ('doordash-25-gift-card', '$25 DoorDash Gift Card', 'DoorDash', 'Dining & Delivery', '/catalog/reward-cards/doordash-card-red.svg', 2500, 100, 75, 'active'),
  ('home-depot-100-gift-card', '$100 The Home Depot Gift Card', 'The Home Depot', 'Home Essentials', '/catalog/reward-cards/home-depot-card-final.png', 10000, 100, 300, 'active'),
  ('home-depot-75-gift-card', '$75 The Home Depot Gift Card', 'The Home Depot', 'Home Essentials', '/catalog/reward-cards/home-depot-card-final.png', 7500, 100, 225, 'active'),
  ('home-depot-50-gift-card', '$50 The Home Depot Gift Card', 'The Home Depot', 'Home Essentials', '/catalog/reward-cards/home-depot-card-final.png', 5000, 100, 150, 'active'),
  ('home-depot-25-gift-card', '$25 The Home Depot Gift Card', 'The Home Depot', 'Home Essentials', '/catalog/reward-cards/home-depot-card-final.png', 2500, 100, 75, 'active'),
  ('nintendo-100-gift-card', '$100 Nintendo Gift Card', 'Nintendo', 'Gaming', '/catalog/reward-cards/nintendo.png', 10000, 100, 300, 'active'),
  ('nintendo-75-gift-card', '$75 Nintendo Gift Card', 'Nintendo', 'Gaming', '/catalog/reward-cards/nintendo.png', 7500, 100, 225, 'active'),
  ('nintendo-50-gift-card', '$50 Nintendo Gift Card', 'Nintendo', 'Gaming', '/catalog/reward-cards/nintendo.png', 5000, 100, 150, 'active'),
  ('nintendo-25-gift-card', '$25 Nintendo Gift Card', 'Nintendo', 'Gaming', '/catalog/reward-cards/nintendo.png', 2500, 100, 75, 'active'),
  ('cvs-100-gift-card', '$100 CVS Gift Card', 'CVS', 'Health & Essentials', '/catalog/reward-cards/cvs-card-clean.png', 10000, 100, 300, 'active'),
  ('cvs-75-gift-card', '$75 CVS Gift Card', 'CVS', 'Health & Essentials', '/catalog/reward-cards/cvs-card-clean.png', 7500, 100, 225, 'active'),
  ('cvs-50-gift-card', '$50 CVS Gift Card', 'CVS', 'Health & Essentials', '/catalog/reward-cards/cvs-card-clean.png', 5000, 100, 150, 'active'),
  ('cvs-25-gift-card', '$25 CVS Gift Card', 'CVS', 'Health & Essentials', '/catalog/reward-cards/cvs-card-clean.png', 2500, 100, 75, 'active'),
  ('uber-eats-100-gift-card', '$100 Uber Eats Gift Card', 'Uber Eats', 'Dining & Delivery', '/catalog/reward-cards/uber-eats-card-display.png', 10000, 100, 300, 'active'),
  ('uber-eats-75-gift-card', '$75 Uber Eats Gift Card', 'Uber Eats', 'Dining & Delivery', '/catalog/reward-cards/uber-eats-card-display.png', 7500, 100, 225, 'active'),
  ('uber-eats-50-gift-card', '$50 Uber Eats Gift Card', 'Uber Eats', 'Dining & Delivery', '/catalog/reward-cards/uber-eats-card-display.png', 5000, 100, 150, 'active'),
  ('uber-eats-25-gift-card', '$25 Uber Eats Gift Card', 'Uber Eats', 'Dining & Delivery', '/catalog/reward-cards/uber-eats-card-display.png', 2500, 100, 75, 'active'),
  ('adidas-100-gift-card', '$100 Adidas Gift Card', 'Adidas', 'Apparel & Footwear', '/catalog/reward-cards/adidas-card-display.png', 10000, 100, 300, 'active'),
  ('adidas-75-gift-card', '$75 Adidas Gift Card', 'Adidas', 'Apparel & Footwear', '/catalog/reward-cards/adidas-card-display.png', 7500, 100, 225, 'active'),
  ('adidas-50-gift-card', '$50 Adidas Gift Card', 'Adidas', 'Apparel & Footwear', '/catalog/reward-cards/adidas-card-display.png', 5000, 100, 150, 'active'),
  ('adidas-25-gift-card', '$25 Adidas Gift Card', 'Adidas', 'Apparel & Footwear', '/catalog/reward-cards/adidas-card-display.png', 2500, 100, 75, 'active'),
  ('petsmart-100-gift-card', '$100 PetSmart Gift Card', 'PetSmart', 'Pet Essentials', '/catalog/reward-cards/petsmart.jpg', 10000, 100, 300, 'active'),
  ('petsmart-75-gift-card', '$75 PetSmart Gift Card', 'PetSmart', 'Pet Essentials', '/catalog/reward-cards/petsmart.jpg', 7500, 100, 225, 'active'),
  ('petsmart-50-gift-card', '$50 PetSmart Gift Card', 'PetSmart', 'Pet Essentials', '/catalog/reward-cards/petsmart.jpg', 5000, 100, 150, 'active'),
  ('petsmart-25-gift-card', '$25 PetSmart Gift Card', 'PetSmart', 'Pet Essentials', '/catalog/reward-cards/petsmart.jpg', 2500, 100, 75, 'active')
on conflict (slug) do nothing;


create table public.customer_entries (
  id uuid primary key default gen_random_uuid(),
  entry_id text not null unique check (entry_id ~ '^ent_[0-9a-f]+$'),
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null,
  wallet_scope text not null default 'demo' check (wallet_scope = 'demo'),
  offering_slug text not null references demo_private.preview_entry_offerings(slug) on delete restrict,
  amount integer not null check (amount > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  outcome_status text not null check (outcome_status in ('active','winner','not_selected')),
  created_at timestamptz not null default now(),
  unique (customer_id, idempotency_key),
  unique (wallet_account_id, offering_slug),
  unique (id, wallet_account_id, customer_id, wallet_scope, currency),
  foreign key (wallet_account_id, customer_id, wallet_scope, currency)
    references public.wallet_accounts(id, customer_id, scope, currency) on delete restrict
);

create table public.entry_outcomes (
  id uuid primary key default gen_random_uuid(),
  customer_entry_id uuid not null unique,
  customer_id uuid not null,
  wallet_account_id uuid not null,
  wallet_scope text not null default 'demo' check (wallet_scope = 'demo'),
  currency text not null default 'USD' check (currency = 'USD'),
  outcome text not null check (outcome in ('winner','not_selected')),
  determined_at timestamptz not null default now(),
  foreign key (customer_entry_id, wallet_account_id, customer_id, wallet_scope, currency)
    references public.customer_entries(id, wallet_account_id, customer_id, wallet_scope, currency) on delete restrict
);

create table public.completion_options (
  id uuid primary key default gen_random_uuid(),
  customer_entry_id uuid not null unique,
  customer_id uuid not null,
  wallet_account_id uuid not null,
  wallet_scope text not null default 'demo' check (wallet_scope = 'demo'),
  currency text not null default 'USD' check (currency = 'USD'),
  paid_cents integer not null check (paid_cents > 0),
  remaining_cents integer not null check (remaining_cents >= 0),
  status text not null default 'available' check (status = 'available'),
  created_at timestamptz not null default now(),
  foreign key (customer_entry_id, wallet_account_id, customer_id, wallet_scope, currency)
    references public.customer_entries(id, wallet_account_id, customer_id, wallet_scope, currency) on delete restrict
);

create table public.customer_rewards (
  id uuid primary key default gen_random_uuid(),
  customer_entry_id uuid not null unique,
  customer_id uuid not null,
  wallet_account_id uuid not null,
  wallet_scope text not null default 'demo' check (wallet_scope = 'demo'),
  currency text not null default 'USD' check (currency = 'USD'),
  reward_kind text not null default 'digital' check (reward_kind = 'digital'),
  status text not null default 'preview_ready' check (status = 'preview_ready'),
  created_at timestamptz not null default now(),
  foreign key (customer_entry_id, wallet_account_id, customer_id, wallet_scope, currency)
    references public.customer_entries(id, wallet_account_id, customer_id, wallet_scope, currency) on delete restrict
);

alter table public.ledger_entries add column customer_entry_id uuid;
alter table public.ledger_entries add constraint ledger_customer_entry_identity
  foreign key (customer_entry_id, wallet_account_id, customer_id, wallet_scope, currency)
  references public.customer_entries(id, wallet_account_id, customer_id, wallet_scope, currency) on delete restrict;
alter table public.ledger_entries add constraint ledger_entry_debit_shape check (
  customer_entry_id is null
  or (entry_type = 'ENTRY_DEBIT' and balance_type = 'PLAYABLE' and amount < 0 and related_entry_id is not null)
);
create unique index ledger_customer_entry_once on public.ledger_entries(customer_entry_id)
  where customer_entry_id is not null;

create index customer_entries_owner_history_idx
  on public.customer_entries(customer_id, wallet_account_id, created_at desc, id desc);

alter table public.customer_entries enable row level security;
alter table public.entry_outcomes enable row level security;
alter table public.completion_options enable row level security;
alter table public.customer_rewards enable row level security;

revoke all on public.customer_entries, public.entry_outcomes, public.completion_options, public.customer_rewards
  from public, anon, authenticated, service_role;
grant select on public.customer_entries, public.entry_outcomes, public.completion_options, public.customer_rewards
  to authenticated;

create policy "Customers can view own current entries" on public.customer_entries
for select to authenticated using (
  customer_id = (select auth.uid())
  and wallet_account_id = (select public.current_wallet_account_id())
);
create policy "Customers can view own current outcomes" on public.entry_outcomes
for select to authenticated using (
  customer_id = (select auth.uid())
  and wallet_account_id = (select public.current_wallet_account_id())
);
create policy "Customers can view own current completion options" on public.completion_options
for select to authenticated using (
  customer_id = (select auth.uid())
  and wallet_account_id = (select public.current_wallet_account_id())
);
create policy "Customers can view own current rewards" on public.customer_rewards
for select to authenticated using (
  customer_id = (select auth.uid())
  and wallet_account_id = (select public.current_wallet_account_id())
);

create trigger customer_entries_immutable before update or delete on public.customer_entries
  for each row execute function public.reject_financial_history_mutation();
create trigger customer_entries_no_truncate before truncate on public.customer_entries
  for each statement execute function public.reject_financial_history_mutation();
create trigger entry_outcomes_immutable before update or delete on public.entry_outcomes
  for each row execute function public.reject_financial_history_mutation();
create trigger entry_outcomes_no_truncate before truncate on public.entry_outcomes
  for each statement execute function public.reject_financial_history_mutation();
create trigger completion_options_immutable before update or delete on public.completion_options
  for each row execute function public.reject_financial_history_mutation();
create trigger completion_options_no_truncate before truncate on public.completion_options
  for each statement execute function public.reject_financial_history_mutation();
create trigger customer_rewards_immutable before update or delete on public.customer_rewards
  for each row execute function public.reject_financial_history_mutation();
create trigger customer_rewards_no_truncate before truncate on public.customer_rewards
  for each statement execute function public.reject_financial_history_mutation();

create function demo_private.preview_entry_response(p_entry_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entryId', e.entry_id,
    'offeringSlug', e.offering_slug,
    'status', e.outcome_status,
    'amountCents', e.amount,
    'duplicate', false
  )
  from public.customer_entries e where e.id = p_entry_id;
$$;
revoke all on function demo_private.preview_entry_response(uuid) from public, anon, authenticated, service_role;

create function public.create_preview_entry(p_offering_slug text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_wallet uuid;
  v_offering demo_private.preview_entry_offerings;
  v_existing public.customer_entries;
  v_entry public.customer_entries;
  v_balance bigint;
  v_issuer text := auth.jwt()->>'iss';
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_offering_slug is null or p_offering_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'Invalid entry request' using errcode = '22023';
  end if;
  if not coalesce((select preview_entries_enabled and preview_issuer = v_issuer
    from demo_private.funding_config where singleton), false) then
    raise exception 'Preview entries are not permitted in this environment' using errcode = '42501';
  end if;

  -- Uses the established customer -> membership -> wallet lock order.
  v_wallet := demo_private.lock_funding_wallet();

  select * into v_existing from public.customer_entries
    where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.wallet_account_id <> v_wallet or v_existing.offering_slug <> p_offering_slug then
      raise exception 'Idempotency key belongs to a different entry request' using errcode = '22023';
    end if;
    return demo_private.preview_entry_response(v_existing.id) || jsonb_build_object('duplicate', true);
  end if;

  select * into v_offering from demo_private.preview_entry_offerings
    where slug = p_offering_slug and active for share;
  if not found then raise exception 'This preview offering is unavailable' using errcode = '22023'; end if;

  -- These limits are database-enforced and survive new browser sessions.
  if (select count(*) from public.customer_entries
      where customer_id = v_uid and created_at > clock_timestamp() - interval '1 minute') >= 5 then
    raise exception 'Demo limit: five entries per minute.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.customer_entries
      where customer_id = v_uid and created_at > clock_timestamp() - interval '24 hours') >= 100 then
    raise exception 'Demo limit: one hundred entries per day.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.customer_entries
      where wallet_account_id = v_wallet and offering_slug = p_offering_slug) then
    raise exception 'This preview wallet already has an entry for this product.' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount) filter (where balance_type = 'PLAYABLE'), 0)
    into v_balance from public.ledger_entries
    where customer_id = v_uid and wallet_account_id = v_wallet;
  if v_balance < v_offering.entry_price_cents then
    raise exception 'Add demo funds before entering this product.' using errcode = 'P0001';
  end if;

  insert into public.customer_entries(
    entry_id, customer_id, wallet_account_id, offering_slug, amount,
    idempotency_key, outcome_status
  ) values (
    'ent_' || replace(gen_random_uuid()::text, '-', ''), v_uid, v_wallet,
    v_offering.slug, v_offering.entry_price_cents, p_idempotency_key,
    v_offering.forced_outcome
  ) returning * into v_entry;

  insert into public.ledger_entries(
    ledger_entry_id, customer_id, entry_type, balance_type, amount, currency,
    source_event, related_pool_id, related_entry_id, wallet_account_id,
    wallet_scope, customer_entry_id
  ) values (
    'len_' || replace(gen_random_uuid()::text, '-', ''), v_uid,
    'ENTRY_DEBIT', 'PLAYABLE', -v_offering.entry_price_cents, 'USD',
    'preview_entry_' || v_entry.id::text, 'preview_' || v_offering.slug,
    v_entry.entry_id, v_wallet, 'demo', v_entry.id
  );

  if v_offering.forced_outcome in ('winner','not_selected') then
    insert into public.entry_outcomes(customer_entry_id, customer_id, wallet_account_id, outcome)
      values (v_entry.id, v_uid, v_wallet, v_offering.forced_outcome);
  end if;
  if v_offering.forced_outcome = 'winner' then
    insert into public.customer_rewards(customer_entry_id, customer_id, wallet_account_id)
      values (v_entry.id, v_uid, v_wallet);
  elsif v_offering.forced_outcome = 'not_selected' then
    insert into public.completion_options(
      customer_entry_id, customer_id, wallet_account_id, paid_cents, remaining_cents
    ) values (
      v_entry.id, v_uid, v_wallet, v_offering.entry_price_cents,
      greatest(v_offering.value_cents - v_offering.entry_price_cents, 0)
    );
  end if;

  return demo_private.preview_entry_response(v_entry.id);
end;
$$;
revoke all on function public.create_preview_entry(text,text) from public, anon, authenticated, service_role;
grant execute on function public.create_preview_entry(text,text) to authenticated;

create function public.get_account_activity()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc, a.entry_id desc), '[]'::jsonb)
  into v_rows from (
    select e.entry_id, e.offering_slug as slug, o.title, o.retailer,
      o.image_path as image,
      case e.outcome_status when 'winner' then 'prize'
        when 'not_selected' then 'completion' else 'active' end as status,
      'digital'::text as reward_kind,
      o.value_cents as price_cents, e.amount as paid_cents,
      case when e.outcome_status = 'not_selected'
        then greatest(o.value_cents - e.amount, 0) else 0 end as remaining_cents,
      case e.outcome_status when 'winner' then 'Ready in your wallet'
        when 'not_selected' then 'Purchase option available'
        else 'Entry recorded' end as availability,
      e.created_at
    from public.customer_entries e
    join demo_private.preview_entry_offerings o on o.slug = e.offering_slug
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet
  ) a;
  return v_rows;
end;
$$;
revoke all on function public.get_account_activity() from public, anon, authenticated, service_role;
grant execute on function public.get_account_activity() to authenticated;

create function public.get_preview_entry_reconciliation()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id(); v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into v_rows from (
    select e.entry_id, e.offering_slug, e.created_at,
      case
        when l.id is null or l.amount <> -e.amount then 'discrepancy'
        when e.outcome_status = 'active' and x.id is null and c.id is null and w.id is null then 'reconciled'
        when e.outcome_status = 'winner' and x.outcome = 'winner' and w.id is not null and c.id is null then 'reconciled'
        when e.outcome_status = 'not_selected' and x.outcome = 'not_selected' and c.id is not null and w.id is null then 'reconciled'
        else 'discrepancy'
      end as reconciliation
    from public.customer_entries e
    left join public.ledger_entries l on l.customer_entry_id = e.id
    left join public.entry_outcomes x on x.customer_entry_id = e.id
    left join public.completion_options c on c.customer_entry_id = e.id
    left join public.customer_rewards w on w.customer_entry_id = e.id
    where e.customer_id = auth.uid() and e.wallet_account_id = v_wallet
  ) r;
  return v_rows;
end;
$$;
revoke all on function public.get_preview_entry_reconciliation() from public, anon, authenticated, service_role;
grant execute on function public.get_preview_entry_reconciliation() to authenticated;

notify pgrst, 'reload schema';
commit;
