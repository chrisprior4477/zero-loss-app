import { createClient } from "@/lib/supabase/server";
import { ledgerEntryProduct } from "./history";
import type { LedgerEntryRow, WalletSnapshot } from "./snapshot";

export type SelectedTransaction = { requested: boolean; entry: LedgerEntryRow | null };

/** Reuse the snapshot or read one older row under the current customer's Ledger RLS. */
export async function selectedTransaction(value: unknown, userId: string, wallet: WalletSnapshot | null): Promise<SelectedTransaction> {
  if (value === undefined) return { requested: false, entry: null };
  const unavailable = { requested: true, entry: null };
  if (typeof value !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value) || !wallet) return unavailable;
  const transactionId = value.toLowerCase();
  const cached = wallet.entries.find(entry => entry.id === transactionId);
  if (cached) return { requested: true, entry: cached };
  const db = await createClient();
  // wallet_scope is deliberately not customer-readable. RLS enforces it.
  const { data, error } = await db.from("ledger_entries").select("id,entry_type,amount,created_at,source_event,related_pool_id,related_entry_id")
    .eq("customer_id", userId).eq("id", transactionId).maybeSingle();
  if (error || !data || data.id !== transactionId || typeof data.entry_type !== "string" || !Number.isSafeInteger(data.amount) || data.amount === 0 || typeof data.created_at !== "string" || !Number.isFinite(Date.parse(data.created_at))) return unavailable;
  const { id, entry_type, amount, created_at, related_entry_id, source_event, related_pool_id } = data;
  const product = typeof source_event === "string" ? await ledgerEntryProduct(db, userId, { entry_type, source_event, related_pool_id }) : undefined;
  return { requested: true, entry: { id, entry_type, amount, created_at, ...(product ? { product } : {}),
    ...(typeof related_entry_id === "string" && related_entry_id ? { entryIds: [related_entry_id] } : {}) } };
}
