begin;
create extension if not exists pgtap;
select no_plan();

update demo_private.funding_config set enabled = true,
  preview_provisioning_enabled = true, preview_entries_enabled = true,
  entry_undo_required = true, entry_recovery_required = true,
  preview_issuer = 'https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1'
where singleton;

insert into demo_private.preview_entry_offerings(
  slug, title, retailer, category, image_path, value_cents,
  entry_price_cents, capacity, sample_entries, forced_outcome,
  repeatable_scenario
) values ('replay-after-clear-test', 'Replay after clear', 'Test retailer',
  'Test', '/test.png', 2500, 100, 4, 3, 'active', false);

insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data)
values ('88888888-8888-4888-8888-888888888881', 'replay-after-clear@example.test',
  now(), '{"legal_first_name":"Replay","legal_last_name":"Test","date_of_birth":"1990-01-01"}'::jsonb);
update public.customers set status = 'active', verification_status = 'email_verified'
where id = '88888888-8888-4888-8888-888888888881';
select demo_private.ensure_preview_customer_for('88888888-8888-4888-8888-888888888881');
insert into public.ledger_entries(ledger_entry_id, customer_id, entry_type,
  balance_type, amount, currency, source_event, wallet_account_id, wallet_scope)
select 'len_' || replace(gen_random_uuid()::text, '-', ''), w.customer_id,
  'DEPOSIT', 'PLAYABLE', 1000, 'USD', 'replay_after_clear_test_funding', w.id, 'demo'
from public.wallet_accounts w
where w.customer_id = '88888888-8888-4888-8888-888888888881' and w.closed_at is null;

set local role authenticated;
select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888881', true);
select set_config('request.jwt.claims',
  '{"sub":"88888888-8888-4888-8888-888888888881","iss":"https://ocgdfnvvjvutevgqzzgj.supabase.co/auth/v1"}', true);

select is((select (a->>'remaining')::integer from jsonb_array_elements(
  public.get_preview_offering_availability()) a
  where a->>'slug' = 'replay-after-clear-test'), 1,
  'ordinary offer begins with one available demo slot');
select public.create_preview_entries('replay-after-clear-test', 1, 'replay_first_request_01');
select public.confirm_preview_entry_request((select id from public.entry_requests
  where offering_slug = 'replay-after-clear-test' order by requested_at desc limit 1));
select is((select count(*)::integer from jsonb_array_elements(public.get_account_activity()) a
  where a->>'status' = 'completion'), 1,
  'closing an ordinary pool creates a purchase option, not a win');
select is((select count(*)::integer from public.customer_rewards r
  join public.customer_entries e on e.id = r.customer_entry_id
  where e.offering_slug = 'replay-after-clear-test'), 0,
  'ordinary closed pool creates no customer winner reward');

select is(public.clear_own_demo_entries(1, 'replay_clear_request_01')->>'clearedCount',
  '1', 'Clear All Entries removes the saved entry from current activity');
select is((select count(*)::integer from jsonb_array_elements(public.get_account_activity())),
  0, 'cleared purchase option disappears from My Activity');
select is((select (a->>'remaining')::integer from jsonb_array_elements(
  public.get_preview_offering_availability()) a
  where a->>'slug' = 'replay-after-clear-test'), 1,
  'cleared entry restores its slot for Ending Soon and the rest of the marketplace');

select is(public.submit_preview_entries('replay-after-clear-test', 1,
  'replay_second_request_01', false,
  (select id from public.entry_requests where offering_slug = 'replay-after-clear-test'
    order by requested_at desc limit 1))->>'status', 'pending',
  'the restored demo slot can actually be entered again');
select public.confirm_preview_entry_request((select id from public.entry_requests
  where offering_slug = 'replay-after-clear-test' order by requested_at desc limit 1));
select is((select count(*)::integer from jsonb_array_elements(public.get_account_activity()) a
  where a->>'status' = 'completion'), 1,
  'second pool closing produces a new purchase option');
reset role;
select is((select count(*)::integer from public.customer_entries
  where offering_slug = 'replay-after-clear-test'), 2,
  'replay preserves both immutable entry records');
select is((select count(*)::integer from demo_private.preview_entry_offerings
  where active and forced_outcome = 'winner'), 2,
  'only the Samsung TV and Walmart gift card are scripted demo winners');
select * from finish();
rollback;
