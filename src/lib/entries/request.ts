export type EntryRequest = {
  requestId: string;
  slug: string;
  title: string;
  quantity: number;
  amountCents: number;
  status: "pending" | "accepted" | "cancelled" | "rejected";
  undoUntil: string;
  serverNow: string;
  href: string | null;
};

export const ENTRY_REQUEST_EVENT = "zero-loss-entry-request";
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function entryReceiptHref(data: Record<string, unknown>, slug: string): string {
  const entryId = typeof data.entryId === "string" && /^ent_[0-9a-f]+$/.test(data.entryId) ? data.entryId : null;
  const rewardId = typeof data.rewardId === "string" && uuid.test(data.rewardId) ? data.rewardId : null;
  return data.status === "winner"
    ? rewardId ? `/account/wallet?${new URLSearchParams({ reward: slug, rewardId })}` : "/account/wallet"
    : entryId ? `/account/entries?${new URLSearchParams({ item: slug, entry: entryId })}` : "/account/entries";
}

export function parseEntryRequest(value: unknown): EntryRequest {
  if (!value || typeof value !== "object") throw new Error("Invalid entry request receipt");
  const r = value as Record<string, unknown>;
  if (typeof r.requestId !== "string" || !uuid.test(r.requestId) ||
    typeof r.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug) ||
    typeof r.title !== "string" || typeof r.quantity !== "number" || !Number.isInteger(r.quantity) || r.quantity < 1 || r.quantity > 10 ||
    typeof r.amountCents !== "number" || !Number.isSafeInteger(r.amountCents) || r.amountCents <= 0 ||
    !["pending", "accepted", "cancelled", "rejected"].includes(String(r.status)) ||
    typeof r.undoUntil !== "string" || !Number.isFinite(Date.parse(r.undoUntil)) ||
    typeof r.serverNow !== "string" || !Number.isFinite(Date.parse(r.serverNow))) throw new Error("Invalid entry request receipt");
  if (r.status === "accepted" && (!r.receipt || typeof r.receipt !== "object" ||
    !["active", "winner", "not_selected"].includes(String((r.receipt as Record<string, unknown>).status)))) throw new Error("Missing entry result");
  return {
    requestId: r.requestId, slug: r.slug, title: r.title, quantity: r.quantity, amountCents: r.amountCents,
    status: r.status as EntryRequest["status"], undoUntil: r.undoUntil, serverNow: r.serverNow,
    href: r.status === "accepted" ? entryReceiptHref(r.receipt as Record<string, unknown>, r.slug) : null,
  };
}
