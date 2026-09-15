export type WalletSnapshot = {
  walletAccountId: string | null;
  scope: "production" | "demo";
  currency: "USD";
  balanceCents: number;
  transactionCount: number;
  fundingAvailable: boolean;
  entries: LedgerEntryRow[];
};

function exactInteger(value: unknown, name: string): number {
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
    throw new Error(`Invalid wallet ${name}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Unsafe wallet ${name}`);
  return parsed;
}

/** Reject incomplete/unsafe responses rather than turning them into a $0 wallet. */
export function parseWalletSnapshot(value: unknown): WalletSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Wallet snapshot is unavailable");
  }
  const row = value as Record<string, unknown>;
  if (
    (row.scope !== "production" && row.scope !== "demo") ||
    row.currency !== "USD" ||
    typeof row.fundingAvailable !== "boolean" ||
    (row.walletAccountId !== null &&
      (typeof row.walletAccountId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.walletAccountId)))
  ) throw new Error("Invalid wallet context");

  const balanceCents = exactInteger(row.balanceCents, "balance");
  const transactionCount = exactInteger(row.transactionCount, "transaction count");
  if (!Array.isArray(row.entries) || row.entries.length !== Math.min(transactionCount, 50)) {
    throw new Error("Incomplete wallet history");
  }
  const entries: LedgerEntryRow[] = row.entries.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid wallet transaction");
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.entry_type !== "string" ||
        typeof item.amount !== "number" || !Number.isSafeInteger(item.amount) || item.amount === 0 ||
        typeof item.created_at !== "string" || !Number.isFinite(Date.parse(item.created_at))) {
      throw new Error("Invalid wallet transaction");
    }
    return { id: item.id, entry_type: item.entry_type, amount: item.amount, created_at: item.created_at };
  });
  if (transactionCount < 0 ||
      (row.walletAccountId === null &&
        (row.scope === "demo" || balanceCents !== 0 || transactionCount !== 0 || row.fundingAvailable))) {
    throw new Error("Inconsistent wallet context");
  }
  return {
    walletAccountId: row.walletAccountId as string | null,
    scope: row.scope,
    currency: row.currency,
    balanceCents,
    transactionCount,
    fundingAvailable: row.fundingAvailable,
    entries,
  };
}
export type LedgerEntryRow = {
  id: string;
  entry_type: string;
  amount: number;
  created_at: string;
};
