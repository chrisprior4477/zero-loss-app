-- Fresh replay must recover catalog metadata without activating payments.
-- Every test is transactional; this inspects the initial migration state.
begin;
create extension if not exists pgtap;
select plan(7);

select ok(
  (select not enabled and not preview_provisioning_enabled and not preview_entries_enabled
   from demo_private.funding_config where singleton),
  'fresh replay leaves all funding and entry gates disabled'
);
select is((select count(*) from public.customers), 0::bigint,
  'bootstrap creates no customer identities');
select is((select count(*) from public.ledger_entries), 0::bigint,
  'bootstrap creates no financial history');
select is((select count(*) from demo_private.preview_entry_offerings
  where slug in ('walmart-100-gift-card', 'dunkin-25-gift-card', 'lowes-150-gift-card')),
  3::bigint, 'historical migration prerequisites exist');
select is((select entry_price_cents from demo_private.preview_entry_offerings
  where slug = 'lowes-150-gift-card'), 100, 'future Lowes entries retain the approved price');
select is((select count(*) from demo_private.preview_popular_reward_scenarios
  where offering_slug not like 'directory-%'), 40::bigint,
  'all original popular reward scenarios are recovered');
select ok((select count(*) > 0 from demo_private.preview_entry_offerings
  where slug like 'directory-%'), 'directory catalog is recovered');

select * from finish();
rollback;
