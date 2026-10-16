-- Demo-only presentation archives. Financial and payment records remain immutable.
begin;

create table demo_private.wallet_history_reset_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  kind text not null check (kind in ('transactions', 'deposits')),
  request_key text not null check (request_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  cleared_cents bigint not null default 0 check (cleared_cents >= 0),
  created_at timestamptz not null default now(),
  unique (wallet_account_id, kind, request_key)
);

create table demo_private.wallet_history_archives (
  id uuid primary key default gen_random_uuid(),
  reset_id uuid not null references demo_private.wallet_history_reset_requests(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  ledger_entry_id uuid references public.ledger_entries(id) on delete restrict,
  funding_session_id uuid references public.demo_funding_sessions(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint one_archived_record check ((ledger_entry_id is null) <> (funding_session_id is null))
);
create index wallet_history_reset_customer_idx
  on demo_private.wallet_history_reset_requests(customer_id);
create index wallet_history_archives_reset_idx
  on demo_private.wallet_history_archives(reset_id);
create index wallet_history_archives_customer_idx
  on demo_private.wallet_history_archives(customer_id);
create unique index wallet_history_archived_ledger_once
  on demo_private.wallet_history_archives(ledger_entry_id) where ledger_entry_id is not null;
create unique index wallet_history_archived_deposit_once
  on demo_private.wallet_history_archives(funding_session_id) where funding_session_id is not null;
create index wallet_history_archives_wallet_idx
  on demo_private.wallet_history_archives(wallet_account_id, customer_id);

alter table demo_private.wallet_history_reset_requests enable row level security;
alter table demo_private.wallet_history_archives enable row level security;
revoke all on demo_private.wallet_history_reset_requests, demo_private.wallet_history_archives
  from public, anon, authenticated, service_role;
create trigger wallet_history_reset_requests_immutable before update or delete
  on demo_private.wallet_history_reset_requests for each row
  execute function public.reject_financial_history_mutation();
create trigger wallet_history_archives_immutable before update or delete
  on demo_private.wallet_history_archives for each row
  execute function public.reject_financial_history_mutation();
create trigger wallet_history_reset_requests_no_truncate before truncate
  on demo_private.wallet_history_reset_requests for each statement
  execute function public.reject_financial_history_mutation();
create trigger wallet_history_archives_no_truncate before truncate
  on demo_private.wallet_history_archives for each statement
  execute function public.reject_financial_history_mutation();

create function public.get_demo_wallet_history_visibility() returns jsonb
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
        and a.funding_session_id is not null), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_demo_wallet_history_visibility()
  from public, anon, authenticated, service_role;
grant execute on function public.get_demo_wallet_history_visibility() to authenticated;

create function public.clear_demo_wallet_history(
  p_kind text, p_expected_balance_cents bigint, p_request_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_wallet uuid;
  v_balance bigint;
  v_existing demo_private.wallet_history_reset_requests;
  v_reset uuid := gen_random_uuid();
  v_cleared bigint := 0;
  v_count integer := 0;
begin
  if p_kind not in ('transactions', 'deposits') or p_kind is null
    or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_expected_balance_cents is null or p_expected_balance_cents < 0 then
    raise exception 'Invalid demo history clear request' using errcode = '22023';
  end if;
  perform demo_private.assert_card_environment();
  v_wallet := demo_private.lock_funding_wallet();

  select * into v_existing from demo_private.wallet_history_reset_requests
    where wallet_account_id = v_wallet and customer_id = auth.uid()
      and kind = p_kind and request_key = p_request_key;
  if found then
    select count(*) into v_count from demo_private.wallet_history_archives
      where reset_id = v_existing.id and
        case when p_kind = 'deposits' then funding_session_id is not null else ledger_entry_id is not null end;
    return jsonb_build_object('hiddenCount', v_count,
      'clearedCents', v_existing.cleared_cents::text, 'alreadyApplied', true);
  end if;

  select coalesce(sum(amount) filter (where balance_type = 'PLAYABLE'), 0)
    into v_balance from public.ledger_entries
    where wallet_account_id = v_wallet and customer_id = auth.uid();
  if v_balance <> p_expected_balance_cents then
    raise exception 'Balance changed. Review the current amount and try again.' using errcode = 'P0001';
  end if;

  if p_kind = 'deposits' then
    -- An interrupted or discrepant payment must remain visible for recovery.
    if exists (select 1 from jsonb_array_elements(public.get_demo_funding_requests()) r
      where r->>'reconciliation' <> 'reconciled') then
      raise exception 'Resolve pending demo deposits before clearing history' using errcode = 'P0002';
    end if;
    v_cleared := (public.clear_demo_playable_balance(p_expected_balance_cents, p_request_key)->>'clearedCents')::bigint;
  end if;

  insert into demo_private.wallet_history_reset_requests
    (id, customer_id, wallet_account_id, kind, request_key, cleared_cents)
    values (v_reset, auth.uid(), v_wallet, p_kind, p_request_key, v_cleared);

  if p_kind = 'transactions' then
    insert into demo_private.wallet_history_archives
      (reset_id, customer_id, wallet_account_id, ledger_entry_id)
      select v_reset, auth.uid(), v_wallet, l.id from public.ledger_entries l
      where l.wallet_account_id = v_wallet and l.customer_id = auth.uid()
      on conflict do nothing;
    get diagnostics v_count = row_count;
  else
    insert into demo_private.wallet_history_archives
      (reset_id, customer_id, wallet_account_id, funding_session_id)
      select v_reset, auth.uid(), v_wallet, s.id from public.demo_funding_sessions s
      where s.wallet_account_id = v_wallet and s.customer_id = auth.uid()
      on conflict do nothing;
    get diagnostics v_count = row_count;
    -- The offsetting balance entry is audit evidence, not a new demo purchase.
    insert into demo_private.wallet_history_archives
      (reset_id, customer_id, wallet_account_id, ledger_entry_id)
      select v_reset, auth.uid(), v_wallet, l.id from public.ledger_entries l
      where l.wallet_account_id = v_wallet and l.customer_id = auth.uid()
        and l.source_event = 'customer_demo_balance_clear_' || p_request_key
      on conflict do nothing;
  end if;

  return jsonb_build_object('hiddenCount', v_count, 'clearedCents', v_cleared::text,
    'alreadyApplied', false);
end;
$$;
revoke all on function public.clear_demo_wallet_history(text,bigint,text)
  from public, anon, authenticated, service_role;
grant execute on function public.clear_demo_wallet_history(text,bigint,text) to authenticated;

notify pgrst, 'reload schema';
commit;
