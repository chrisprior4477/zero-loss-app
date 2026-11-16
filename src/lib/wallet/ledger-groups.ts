import type { LedgerEntryRow } from "./snapshot";

type Stack = { kind: "entries" | "reservation"; rows: LedgerEntryRow[]; amount: number };
type LedgerGroup = { rows: LedgerEntryRow[]; offset: number; stack?: Stack };

/** Group filtered records by their recorded submission or exact reservation. */
export function ledgerGroups(entries: LedgerEntryRow[], grouped = true): LedgerGroup[] {
  const keys = new Map<string, LedgerEntryRow[]>();
  const rowKeys = new Map<string, string>();
  if (grouped) for (const entry of entries) {
    const key = entry.entry_type === "ENTRY_DEBIT" && entry.amount < 0 && entry.entryBatchId && entry.product?.slug
      ? `entries:${entry.entryBatchId}:${entry.product.slug}`
      : (entry.entry_type === "ENTRY_HOLD" || entry.entry_type === "ENTRY_HOLD_RELEASE") && entry.entryRequestId
        ? `reservation:${entry.entryRequestId}` : null;
    if (!key) continue;
    rowKeys.set(entry.id, key);
    const rows = keys.get(key);
    if (rows) rows.push(entry);
    else keys.set(key, [entry]);
  }

  const stacks = new Map<string, Stack>();
  for (const [key, rows] of keys) {
    if (rows.length < 2) continue;
    const amount = rows.reduce((sum, row) => sum + row.amount, 0);
    if (!Number.isSafeInteger(amount)) continue;
    if (key.startsWith("entries:")) {
      stacks.set(key, { kind: "entries", rows, amount });
    } else if (rows.length === 2 && amount === 0 && rows.some(row => row.entry_type === "ENTRY_HOLD" && row.amount < 0)
      && rows.some(row => row.entry_type === "ENTRY_HOLD_RELEASE" && row.amount > 0)) {
      stacks.set(key, { kind: "reservation", rows, amount });
    }
  }

  let offset = 0;
  return entries.flatMap(entry => {
    const stack = stacks.get(rowKeys.get(entry.id) ?? "");
    if (stack && stack.rows[0] !== entry) return [];
    const rows = stack?.rows ?? [entry];
    const group = { rows, offset, stack };
    offset += rows.length;
    return [group];
  });
}
