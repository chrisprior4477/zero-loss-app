export type DemoWalletHistoryVisibility = {
  ledgerEntryIds: string[];
  fundingSessionIds: string[];
  fullReset: boolean;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseDemoWalletHistoryVisibility(value: unknown): DemoWalletHistoryVisibility {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Demo history unavailable");
  const row = value as Record<string, unknown>;
  if (!Array.isArray(row.ledgerEntryIds) || !row.ledgerEntryIds.every(id => typeof id === "string" && uuid.test(id))
    || !Array.isArray(row.fundingSessionIds) || !row.fundingSessionIds.every(id => typeof id === "string" && uuid.test(id))) {
    throw new Error("Invalid demo history state");
  }
  if (row.fullReset !== undefined && typeof row.fullReset !== "boolean") throw new Error("Invalid demo reset state");
  return { ledgerEntryIds: row.ledgerEntryIds, fundingSessionIds: row.fundingSessionIds, fullReset: row.fullReset === true };
}
