import type { LedgerEntryRow } from "@/lib/wallet/snapshot";

/** Display-only: collapse a verified hold → release → purchase into its posted
 * purchase. Never infer a relationship from product, amount, or nearby time. */
export function entryProcessingNotifications(entries: readonly LedgerEntryRow[]): LedgerEntryRow[] {
  const debits = entries.filter(row => row.entry_type === "ENTRY_DEBIT");
  const completed = new Set<string>();
  for (const row of entries) {
    if (row.entry_type !== "ENTRY_HOLD" && row.entry_type !== "ENTRY_HOLD_RELEASE") continue;
    const ids = row.entryIds;
    if (!ids?.length) continue;
    // The full reserved batch must have a confirmed debit for each separate entry.
    if (ids.every(id => debits.some(debit => debit.entryIds?.includes(id)))) completed.add(row.id);
  }
  return entries.filter(row => !completed.has(row.id));
}
