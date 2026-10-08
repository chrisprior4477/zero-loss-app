-- Customer-requested reset of the current DEMO playable balance only.
-- This posts an immutable adjustment; it never edits funding, entries, or rewards.
begin;

create function public.clear_demo_playable_balance(
  p_expected_balance_cents bigint,
  p_request_key text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_wallet uuid;
  v_balance bigint;
  v_previous public.ledger_entries;
  v_event text;
begin
  if p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_expected_balance_cents is null or p_expected_balance_cents < 0 then
    raise exception 'Invalid demo balance clear request' using errcode = '22023';
  end if;

  -- Both checks fail closed outside the configured preview project and demo wallet.
  perform demo_private.assert_card_environment();
  v_wallet := demo_private.lock_funding_wallet();
  v_event := 'customer_demo_balance_clear_' || p_request_key;

  select * into v_previous from public.ledger_entries
    where wallet_account_id = v_wallet and source_event = v_event;
  if found then
    return jsonb_build_object('clearedCents', (-v_previous.amount)::text,
      'alreadyApplied', true);
  end if;

  -- The wallet lock serializes funding, entries, and this reset. Never clear
  -- an amount that arrived after the customer's confirmation was displayed.
  select coalesce(sum(amount) filter (where balance_type = 'PLAYABLE'), 0)
    into v_balance from public.ledger_entries
    where wallet_account_id = v_wallet and customer_id = auth.uid();
  if v_balance <> p_expected_balance_cents then
    raise exception 'Balance changed. Review the current amount and try again.' using errcode = 'P0001';
  end if;
  if v_balance = 0 then
    return jsonb_build_object('clearedCents', '0', 'alreadyApplied', false);
  end if;
  if v_balance > 2147483647 then
    raise exception 'Balance is too large for a single demo adjustment' using errcode = '22003';
  end if;

  insert into public.ledger_entries(
    ledger_entry_id, customer_id, wallet_account_id, wallet_scope,
    entry_type, balance_type, amount, currency, source_event
  ) values (
    'len_' || replace(gen_random_uuid()::text, '-', ''), auth.uid(), v_wallet, 'demo',
    'CORRECTION', 'PLAYABLE', -v_balance::integer, 'USD', v_event
  );
  return jsonb_build_object('clearedCents', v_balance::text, 'alreadyApplied', false);
end;
$$;

revoke all on function public.clear_demo_playable_balance(bigint,text)
  from public, anon, authenticated, service_role;
grant execute on function public.clear_demo_playable_balance(bigint,text) to authenticated;

commit;
