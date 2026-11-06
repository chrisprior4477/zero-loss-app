export type LedgerFilter = "all" | "funding" | "entries" | "purchases" | "refunds";

export const ledgerReturnKey = "zeroLossWalletLedgerReturn";

export type LedgerReturn = {
  walletId: string;
  href: string;
  selectedId?: string;
  filter: LedgerFilter;
  from: string;
  through: string;
  showArchived: boolean;
  offset: number;
  scrollY: number;
  rowId: string;
  rowTop: number;
  expandedRows: string[];
};

/** A per-history-entry bookmark, never account data or a global wallet preference. */
export function readLedgerReturn(state: unknown, walletId: string, href: string, selectedId?: string): LedgerReturn | null {
  if (!state || typeof state !== "object") return null;
  const saved = (state as Record<string, unknown>)[ledgerReturnKey] as Partial<LedgerReturn> | undefined;
  const date = (value: unknown) => typeof value === "string" && (value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (!saved || saved.walletId !== walletId || saved.href !== href || saved.selectedId !== selectedId
    || !["all", "funding", "entries", "purchases", "refunds"].includes(saved.filter ?? "")
    || !date(saved.from) || !date(saved.through) || typeof saved.showArchived !== "boolean"
    || !Number.isSafeInteger(saved.offset) || saved.offset! < 0
    || !Number.isFinite(saved.scrollY) || saved.scrollY! < 0
    || !Number.isFinite(saved.rowTop) || typeof saved.rowId !== "string"
    || !Array.isArray(saved.expandedRows) || !saved.expandedRows.every(id => typeof id === "string")) return null;
  return saved as LedgerReturn;
}
