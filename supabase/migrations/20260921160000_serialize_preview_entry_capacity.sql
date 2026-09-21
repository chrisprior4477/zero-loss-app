-- Financial correctness repair only: no balances, samples, or outcomes change.
-- CREATE OR REPLACE preserves the existing function grants and identity.
begin;

create or replace function public.create_preview_entries(
  p_offering_slug text,
  p_quantity integer,
  p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_wallet uuid;
  v_offering demo_private.preview_entry_offerings;
  v_existing public.preview_entry_batches;
  v_batch public.preview_entry_batches;
  v_entry public.customer_entries;
  v_balance bigint;
  v_recent_minute integer;
  v_recent_day integer;
  v_offering_entries integer;
  v_issuer text := auth.jwt()->>'iss';
  v_index integer;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_offering_slug is null or p_offering_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_quantity is null or p_quantity not between 1 and 10 then
    raise exception 'Invalid entry request' using errcode = '22023';
  end if;
  if not coalesce((select preview_entries_enabled and preview_issuer = v_issuer
    from demo_private.funding_config where singleton), false) then
    raise exception 'Preview entries are not permitted in this environment' using errcode = '42501';
  end if;

  -- Uses the established customer -> membership -> wallet lock order.
  v_wallet := demo_private.lock_funding_wallet();

  select * into v_existing from public.preview_entry_batches
    where customer_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.wallet_account_id <> v_wallet
      or v_existing.offering_slug <> p_offering_slug
      or v_existing.quantity <> p_quantity then
      raise exception 'Idempotency key belongs to a different entry request' using errcode = '22023';
    end if;
    return demo_private.preview_entry_batch_response(v_existing.id, true);
  end if;

  -- Serialize capacity checks across DIFFERENT customer wallets. A shared lock
  -- lets two buyers both count the same last slot before either entry commits.
  -- Keep the established customer -> membership -> wallet -> offering order.
  select * into v_offering from demo_private.preview_entry_offerings
    where slug = p_offering_slug and active for update;
  if not found then raise exception 'This preview offering is unavailable' using errcode = '22023'; end if;

  select count(*) into v_recent_minute from public.customer_entries
    where customer_id = v_uid and created_at > clock_timestamp() - interval '1 minute';
  if v_recent_minute + p_quantity > 10 then
    raise exception 'Demo limit: ten entries per minute.' using errcode = 'P0001';
  end if;
  select count(*) into v_recent_day from public.customer_entries
    where customer_id = v_uid and created_at > clock_timestamp() - interval '24 hours';
  if v_recent_day + p_quantity > 100 then
    raise exception 'Demo limit: one hundred entries per day.' using errcode = 'P0001';
  end if;

  select count(*) into v_offering_entries from public.customer_entries
    where offering_slug = p_offering_slug;
  if v_offering_entries + p_quantity > v_offering.capacity then
    raise exception 'There are not enough entries remaining for that quantity.' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount) filter (where balance_type = 'PLAYABLE'), 0)
    into v_balance from public.ledger_entries
    where customer_id = v_uid and wallet_account_id = v_wallet;
  if v_balance < v_offering.entry_price_cents * p_quantity then
    raise exception 'Add demo funds before entering this quantity.' using errcode = 'P0001';
  end if;

  insert into public.preview_entry_batches(
    batch_id, customer_id, wallet_account_id, offering_slug, quantity, idempotency_key
  ) values (
    'bat_' || replace(gen_random_uuid()::text, '-', ''), v_uid, v_wallet,
    v_offering.slug, p_quantity, p_idempotency_key
  ) returning * into v_batch;

  for v_index in 1..p_quantity loop
    insert into public.customer_entries(
      entry_id, customer_id, wallet_account_id, offering_slug, amount,
      idempotency_key, outcome_status, preview_batch_id
    ) values (
      'ent_' || replace(gen_random_uuid()::text, '-', ''), v_uid, v_wallet,
      v_offering.slug, v_offering.entry_price_cents,
      'batch_' || md5(v_uid::text || ':' || p_idempotency_key || ':' || v_index::text),
      v_offering.forced_outcome, v_batch.id
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
  end loop;

  return demo_private.preview_entry_batch_response(v_batch.id, false);
end;
$$;

notify pgrst, 'reload schema';
commit;
