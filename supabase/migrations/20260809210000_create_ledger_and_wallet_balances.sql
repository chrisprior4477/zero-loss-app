-- Ledger (authoritative) + Wallet balance projections (derived cache)
-- Aligned with enterprise-data-dictionary.md Canonical Ledger / Wallet entities.
-- customer_id uuid matches auth.users / public.customers.id for RLS via auth.uid().
-- Wallet rows are a rebuildable cache only — never an independent financial source of truth.
-- Authenticated clients may SELECT their own rows; inserts/updates are server/ledger-owned only.

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  ledger_entry_id text not null unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  entry_type text not null,
  balance_type text not null,
  amount integer not null,
  currency text not null,
  source_event text not null,
  related_pool_id text,
  related_entry_id text,
  corrects_ledger_entry_id text references public.ledger_entries (ledger_entry_id),
  funding_ip_address text,
  funding_device_fingerprint text,
  created_at timestamptz not null default now(),
  constraint ledger_entries_ledger_entry_id_format_check
    check (ledger_entry_id ~ '^len_[0-9a-f]+$'),
  constraint ledger_entries_entry_type_check
    check (
      entry_type in (
        'DEPOSIT',
        'ENTRY_DEBIT',
        'REBATE_CREDIT',
        'REFUND',
        'PAYOUT',
        'CORRECTION'
      )
    ),
  constraint ledger_entries_balance_type_check
    check (balance_type in ('PLAYABLE', 'REBATE')),
  constraint ledger_entries_currency_format_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint ledger_entries_source_event_not_blank
    check (length(trim(source_event)) > 0)
);

create index ledger_entries_customer_id_created_at_idx
  on public.ledger_entries (customer_id, created_at);

create index ledger_entries_customer_id_balance_type_idx
  on public.ledger_entries (customer_id, balance_type);

create table public.wallet_balances (
  id uuid primary key default gen_random_uuid(),
  wallet_balance_id text not null unique,
  customer_id uuid not null references public.customers (id) on delete cascade,
  balance_type text not null,
  current_balance integer not null,
  last_recalculated_at timestamptz not null,
  last_ledger_entry_id text not null references public.ledger_entries (ledger_entry_id),
  constraint wallet_balances_wallet_balance_id_format_check
    check (wallet_balance_id ~ '^wal_[0-9a-f]+$'),
  constraint wallet_balances_balance_type_check
    check (balance_type in ('PLAYABLE', 'REBATE')),
  constraint wallet_balances_customer_balance_type_unique
    unique (customer_id, balance_type)
);

create index wallet_balances_customer_id_idx
  on public.wallet_balances (customer_id);

alter table public.ledger_entries enable row level security;
alter table public.wallet_balances enable row level security;

create policy "Customers can select own ledger entries"
  on public.ledger_entries
  for select
  to authenticated
  using (auth.uid() = customer_id);

create policy "Customers can select own wallet balances"
  on public.wallet_balances
  for select
  to authenticated
  using (auth.uid() = customer_id);

-- No insert/update/delete policies for authenticated role.
-- Ledger posting and wallet projection rebuilds are server-owned only.

grant select on public.ledger_entries to authenticated;
grant select on public.wallet_balances to authenticated;
