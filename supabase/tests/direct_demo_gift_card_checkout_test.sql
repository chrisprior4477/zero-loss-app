-- Run against demo data. The transaction rolls back every fixture and purchase.
begin;

do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  wallet uuid;
  request_id uuid := gen_random_uuid();
  purchase jsonb;
  reward uuid;
  issuer text;
  card_slug constant text := 'checkout-test-100-gift-card';
begin
  select preview_issuer into issuer from demo_private.funding_config where singleton;
  insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data)
    values (owner_id, owner_id || '@example.test', now(), '{"legal_first_name":"Demo","legal_last_name":"Buyer","date_of_birth":"1990-01-01"}'),
           (other_id, other_id || '@example.test', now(), '{"legal_first_name":"Other","legal_last_name":"Buyer","date_of_birth":"1990-01-01"}');
  update public.customers set status = 'active', verification_status = 'email_verified' where id in (owner_id, other_id);
  perform demo_private.ensure_preview_customer_for(owner_id);
  perform demo_private.ensure_preview_customer_for(other_id);
  select id into wallet from public.wallet_accounts where customer_id = owner_id and scope = 'demo' and closed_at is null;

  insert into demo_private.preview_entry_offerings
    (slug, title, retailer, category, image_path, value_cents, entry_price_cents, capacity, active, direct_checkout)
    values (card_slug, 'Checkout Test Gift Card', 'Test Retailer', 'Test', '/test.png', 10000, 100, 300, false, true),
           ('other-test-100-gift-card', 'Other Test Gift Card', 'Test Retailer', 'Test', '/test.png', 10000, 100, 300, true, true),
           ('checkout-test-25-gift-card', 'Entry Test Gift Card', 'Test Retailer', 'Test', '/test.png', 2500, 100, 75, true, false);
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'iss', issuer)::text, true);

  execute 'set local role authenticated';
  begin
    perform public.purchase_direct_demo_gift_card(card_slug, request_id, 10000);
    raise exception 'An unfunded wallet was allowed to check out';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Add demo funds before buying this gift card.' then raise; end if;
  end;
  begin
    perform public.purchase_direct_demo_gift_card(card_slug, request_id, 9999);
    raise exception 'A changed price was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.purchase_direct_demo_gift_card('checkout-test-25-gift-card', request_id, 2500);
    raise exception 'An entry-only listing was sold directly';
  exception when invalid_parameter_value then null;
  end;
  execute 'reset role';
  assert not exists (select 1 from public.customer_orders where customer_id = owner_id);
  insert into public.ledger_entries
    (ledger_entry_id, customer_id, wallet_account_id, wallet_scope, entry_type, balance_type, amount, source_event, currency)
    values ('len_' || replace(gen_random_uuid()::text, '-', ''), owner_id, wallet, 'demo', 'DEPOSIT', 'PLAYABLE', 10000, 'direct-card-rollback-fixture', 'USD');

  execute 'set local role authenticated';
  purchase := public.purchase_direct_demo_gift_card(card_slug, request_id, 10000);
  reward := (purchase->>'rewardId')::uuid;
  assert purchase->>'status' = 'purchased' and reward is not null;
  assert public.purchase_direct_demo_gift_card(card_slug, request_id, 10000) = purchase;
  begin
    perform public.purchase_direct_demo_gift_card('other-test-100-gift-card', request_id, 10000);
    raise exception 'A reused request changed the purchased listing';
  exception when invalid_parameter_value then null;
  end;
  assert public.get_wallet_snapshot()->>'balanceCents' = '0';
  assert (public.get_account_orders()->0) @> jsonb_build_object('reward_id', reward, 'status', 'fulfilled', 'amount_paid_cents', 10000);
  assert (public.get_account_activity()->0) @> jsonb_build_object('reward_id', reward, 'entry_id', null, 'status', 'completed');
  assert public.get_claimed_reward(reward)->>'redeemable' = 'false';
  assert exists (select 1 from jsonb_array_elements(public.get_preview_offering_availability()) offer
    where offer->>'slug' = card_slug and offer->>'directPriceCents' = '10000');

  perform set_config('request.jwt.claim.sub', other_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', other_id, 'iss', issuer)::text, true);
  assert public.get_account_orders() = '[]'::jsonb and public.get_account_activity() = '[]'::jsonb;
  begin
    perform public.get_claimed_reward(reward);
    raise exception 'A different customer could open the gift card';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  assert (select count(*) from public.ledger_entries where wallet_account_id = wallet and entry_type = 'PURCHASE_DEBIT') = 1;
  assert not exists (select 1 from public.customer_entries where customer_id = owner_id);
  assert not exists (select 1 from public.completion_options where customer_id = owner_id);
end;
$$;

rollback;
