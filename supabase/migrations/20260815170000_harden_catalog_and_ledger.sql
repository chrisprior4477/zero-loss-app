-- Two hardening fixes found while baselining the catalog/ledger/health tables.

-- 1. catalog_items.updated_at was never maintained: the column exists and
-- defaults to now(), but unlike customers and customer_profiles the table had
-- no trigger, so the value never advanced past insert time.

create trigger catalog_items_set_updated_at
  before update on public.catalog_items
  for each row
  execute function public.set_updated_at();

-- 2. Restrict the anti-fraud columns on ledger_entries.
--
-- The "Customers can select own ledger entries" policy scopes rows to the
-- owner, but `grant select` was table-wide, so a customer could read their own
-- funding_ip_address and funding_device_fingerprint through the Data API.
-- Those are fraud signals, not customer-facing data.
--
-- A column-level REVOKE cannot subtract from a table-level grant in Postgres —
-- a table-wide SELECT implies every column, including ones added later. The
-- only way to restrict is to drop the table-level grant and re-grant the
-- permitted columns explicitly.
--
-- Consequence: `select *` on this table now fails for authenticated clients.
-- Callers must name columns. Both current call sites in src/lib/wallet/balance.ts
-- already do. Any column added to this table in future is denied by default
-- until it is added to the list below — deliberate, and the safer direction.

revoke select on public.ledger_entries from authenticated;

grant select (
  id,
  ledger_entry_id,
  customer_id,
  entry_type,
  balance_type,
  amount,
  currency,
  source_event,
  related_pool_id,
  related_entry_id,
  corrects_ledger_entry_id,
  created_at
) on public.ledger_entries to authenticated;
