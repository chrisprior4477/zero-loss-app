export type LedgerFilter = "all" | "funding" | "entries" | "purchases" | "refunds";

export const ledgerReturnKey = "zeroLossWalletLedgerReturn";

export function walletSupportReturnHref(transactionId: string, restoreView: boolean) {
  const id = encodeURIComponent(transactionId);
  return `/account/wallet?view=history&transaction=${id}${restoreView ? "&walletView=1" : ""}#transaction-${id}`;
}

function supportReturnKey(walletId: string, transactionId: string) {
  return `zero-loss-wallet-support:${walletId}:${transactionId}`;
}

export function rememberLedgerSupportReturn(saved: LedgerReturn, transactionId: string) {
  const href = new URL(walletSupportReturnHref(transactionId, true), window.location.origin).href;
  const state = { [ledgerReturnKey]: { ...saved, href, selectedId: transactionId } };
  try { sessionStorage.setItem(supportReturnKey(saved.walletId, transactionId), JSON.stringify(state)); }
  catch { /* The exact transaction link still works. */ }
}

export function readLedgerSupportReturn(walletId: string, href: string, selectedId?: string) {
  if (!selectedId || new URL(href).searchParams.get("walletView") !== "1") return null;
  try {
    return readLedgerReturn(JSON.parse(sessionStorage.getItem(supportReturnKey(walletId, selectedId)) ?? "null"), walletId, href, selectedId);
  } catch { return null; }
}

export type LedgerReturn = {
  walletId: string;
  href: string;
  selectedId?: string;
  filter: LedgerFilter;
  query?: string;
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
    || (saved.query !== undefined && typeof saved.query !== "string")
    || !date(saved.from) || !date(saved.through) || typeof saved.showArchived !== "boolean"
    || !Number.isSafeInteger(saved.offset) || saved.offset! < 0
    || !Number.isFinite(saved.scrollY) || saved.scrollY! < 0
    || !Number.isFinite(saved.rowTop) || typeof saved.rowId !== "string"
    || !Array.isArray(saved.expandedRows) || !saved.expandedRows.every(id => typeof id === "string")) return null;
  return saved as LedgerReturn;
}
