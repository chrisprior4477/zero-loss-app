-- One owner-scoped, atomic replay command. Each domain keeps its original
-- records and performs its own reset; identity and account settings are untouched.
begin;

create table demo_private.all_activity_reset_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  request_key text not null check (request_key ~ '^[A-Za-z0-9_-]{16,108}$'),
  entry_count integer not null check (entry_count >= 0),
  cleared_cents bigint not null check (cleared_cents >= 0),
  created_at timestamptz not null default now(),
  unique (customer_id, request_key)
);
alter table demo_private.all_activity_reset_requests enable row level security;
revoke all on demo_private.all_activity_reset_requests from public, anon, authenticated, service_role;
create trigger all_activity_reset_requests_immutable before update or delete
  on demo_private.all_activity_reset_requests for each row
  execute function public.reject_financial_history_mutation();
create trigger all_activity_reset_requests_no_truncate before truncate
  on demo_private.all_activity_reset_requests for each statement
  execute function public.reject_financial_history_mutation();

create or replace function public.get_demo_wallet_history_visibility() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_wallet uuid := public.current_wallet_account_id();
begin
  if auth.uid() is null or not exists (
    select 1 from public.wallet_accounts
    where id = v_wallet and customer_id = auth.uid() and scope = 'demo' and closed_at is null
  ) then
    raise exception 'Demo wallet unavailable' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'ledgerEntryIds', coalesce((select jsonb_agg(a.ledger_entry_id)
      from demo_private.wallet_history_archives a
      where a.wallet_account_id = v_wallet and a.customer_id = auth.uid()
        and a.ledger_entry_id is not null), '[]'::jsonb),
    'fundingSessionIds', coalesce((select jsonb_agg(a.funding_session_id)
      from demo_private.wallet_history_archives a
      where a.wallet_account_id = v_wallet and a.customer_id = auth.uid()
        and a.funding_session_id is not null), '[]'::jsonb),
    'fullReset', exists (select 1 from demo_private.all_activity_reset_requests r
      where r.wallet_account_id = v_wallet and r.customer_id = auth.uid())
  );
end;
$$;

create function public.reset_all_demo_activity(
  p_expected_entry_count integer, p_expected_balance_cents bigint, p_request_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_wallet uuid;
  v_preview jsonb;
  v_balance bigint;
  v_existing demo_private.all_activity_reset_requests;
begin
  if p_expected_entry_count is null or p_expected_entry_count < 0
    or p_expected_balance_cents is null or p_expected_balance_cents < 0
    or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,108}$' then
    raise exception 'Invalid demo activity reset request' using errcode = '22023';
  end if;

  perform demo_private.assert_card_environment();
  v_wallet := demo_private.lock_funding_wallet();
  select * into v_existing from demo_private.all_activity_reset_requests
    where customer_id = auth.uid() and request_key = p_request_key;
  if found then
    if v_existing.wallet_account_id <> v_wallet
      or v_existing.entry_count <> p_expected_entry_count
      or v_existing.cleared_cents <> p_expected_balance_cents then
      raise exception 'Reset request key was reused' using errcode = '22023';
    end if;
    return jsonb_build_object('clearedCount', v_existing.entry_count,
      'clearedCents', v_existing.cleared_cents::text, 'alreadyApplied', true);
  end if;

  v_preview := public.get_demo_entry_reset_preview();
  if (v_preview->>'pending')::boolean then
    raise exception 'Wait for the pending entry countdown to finish.' using errcode = 'P0002';
  end if;
  if (v_preview->>'entryCount')::integer <> p_expected_entry_count then
    raise exception 'Demo entries changed. Review and confirm again.' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount) filter (where balance_type = 'PLAYABLE'), 0)
    into v_balance from public.ledger_entries
    where wallet_account_id = v_wallet and customer_id = auth.uid();
  if v_balance <> p_expected_balance_cents then
    raise exception 'Demo balance changed. Review and confirm again.' using errcode = 'P0001';
  end if;

  -- These existing owner interfaces enforce redeemable-reward, pending-payment,
  -- and financial audit safeguards. An exception rolls back every step.
  if p_expected_entry_count > 0 then
    perform public.clear_own_demo_entries(p_expected_entry_count, p_request_key || '_entries');
  end if;
  perform public.clear_demo_wallet_history('deposits', p_expected_balance_cents,
    p_request_key || '_deposits');
  perform public.clear_demo_wallet_history('transactions', 0,
    p_request_key || '_transactions');

  insert into demo_private.all_activity_reset_requests
    (customer_id, wallet_account_id, request_key, entry_count, cleared_cents)
    values (auth.uid(), v_wallet, p_request_key, p_expected_entry_count,
      p_expected_balance_cents);
  return jsonb_build_object('clearedCount', p_expected_entry_count,
    'clearedCents', p_expected_balance_cents::text, 'alreadyApplied', false);
end;
$$;
revoke all on function public.reset_all_demo_activity(integer,bigint,text)
  from public, anon, authenticated, service_role;
grant execute on function public.reset_all_demo_activity(integer,bigint,text) to authenticated;

notify pgrst, 'reload schema';
commit;
