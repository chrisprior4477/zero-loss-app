import { createClient } from "@/lib/supabase/server";
import type { LedgerEntryRow, WalletSnapshot } from "./snapshot";

/** Read the complete owner-scoped history in Data API-sized pages. The wallet
 * snapshot remains authoritative for balance and count. */
export async function getCompleteLedgerHistory(userId: string, wallet: WalletSnapshot | null): Promise<LedgerEntryRow[] | null> {
  if (!wallet || wallet.transactionCount <= wallet.entries.length) return wallet?.entries ?? null;
  const db = await createClient();
  const rows: LedgerEntryRow[] = [];
  for (let offset = 0; offset < wallet.transactionCount; offset += 500) {
    const { data, error } = await db.from("ledger_entries").select("id,entry_type,amount,created_at")
      .eq("customer_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, Math.min(offset + 499, wallet.transactionCount - 1));
    if (error || !data || data.length === 0) return null;
    for (const row of data) {
      if (typeof row.id !== "string" || typeof row.entry_type !== "string" || !Number.isSafeInteger(row.amount)
        || row.amount === 0 || typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at))) return null;
      rows.push(row);
    }
  }
  if (rows.length !== wallet.transactionCount || wallet.entries.some((entry, index) => entry.id !== rows[index]?.id)) return null;
  return rows;
}
