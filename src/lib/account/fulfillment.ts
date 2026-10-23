import type { AccountOrder, AccountOrders } from "./orders";
import type { AccountActivity, RewardSource, RewardStatus } from "./activity";

export type FulfillmentFilter = "all" | "processing" | "fulfilled" | "exceptions" | "payment";
export type FulfillmentRecord = Omit<AccountOrder, "orderNumber" | "amountPaidCents" | "status"> & {
  orderNumber: string | null;
  amountPaidCents: number | null;
  entryId: string | null;
  source: RewardSource | null;
  rewardStatus: RewardStatus | null;
  claimedAt: string | null;
  status: AccountOrder["status"] | "expired";
};

export function fulfillmentFilter(value: unknown): FulfillmentFilter {
  return value === "processing" || value === "fulfilled" || value === "exceptions" || value === "payment" ? value : "all";
}

export function fulfillmentHref(rewardId?: string, filter: FulfillmentFilter = "all") {
  const query = new URLSearchParams();
  if (filter !== "all") query.set("filter", filter);
  if (rewardId) query.set("rewardId", rewardId);
  return `/account/orders${query.size ? `?${query}` : ""}#fulfillment-records`;
}

export function fulfillmentActivityHref(record: Pick<FulfillmentRecord, "entryId">) {
  // `viewed` reveals the exact card without redirecting a winning entry back to
  // its wallet pass (the legacy `entry`/`item` detail URL does redirect there).
  return record.entryId ? `/account/entries?viewed=${encodeURIComponent(record.entryId)}` : "/account/entries";
}

export function matchesFulfillmentFilter(record: FulfillmentRecord, filter: FulfillmentFilter) {
  switch (filter) {
    case "processing": return record.status === "payment_confirmed" || record.status === "issuance_pending";
    case "fulfilled": return record.status === "fulfilled";
    case "exceptions": return ["exception", "expired", "cancelled", "corrected"].includes(record.status);
    case "payment": return record.orderNumber !== null;
    default: return true;
  }
}

/** A read-only projection of the SAME owner-authorized records used by Activity
 * and the wallet. Never creates orders, issues rewards, or infers payments. */
export function accountFulfillment(orders: AccountOrders, activity: AccountActivity) {
  const records = new Map<string, FulfillmentRecord>();
  if (orders.source !== "unavailable") for (const order of orders.orders) {
    records.set(order.rewardId, { ...order, entryId: null, source: "purchase", rewardStatus: null, claimedAt: null });
  }
  if (activity.source !== "unavailable") for (const item of activity.activity) {
    if (item.rewardKind !== "digital" || !item.rewardId?.trim()) continue;
    const order = records.get(item.rewardId);
    const rewardStatus = item.rewardStatus ?? null;
    const status = rewardStatus === "expired" ? "expired"
      : rewardStatus === "cancelled" ? "cancelled"
      : rewardStatus === "issuance_failed" ? "exception"
      : rewardStatus === "issuance_pending" ? "issuance_pending"
      // Checkout can emit payment_confirmed and fulfilled with the same DB
      // timestamp. Its historical event ordering must not regress a reward
      // which the authoritative wallet reader already verifies as ready/used.
      : (rewardStatus === "ready" || rewardStatus === "redeemed") && (!order || order.status === "payment_confirmed" || order.status === "issuance_pending") ? "fulfilled"
      : order?.status ?? (rewardStatus === "ready" || rewardStatus === "redeemed" ? "fulfilled" : "issuance_pending");
    records.set(item.rewardId, {
      orderNumber: order?.orderNumber ?? null,
      rewardSlug: item.slug, rewardId: item.rewardId, title: item.title,
      retailer: item.retailer, image: item.image,
      faceValueCents: order?.faceValueCents ?? item.priceCents,
      // Entry spending is NOT checkout spending. Missing checkout data stays unknown.
      amountPaidCents: order?.amountPaidCents ?? null,
      createdAt: order?.createdAt ?? item.enteredAt ?? "",
      entryId: item.entryId ?? null, source: item.rewardSource ?? order?.source ?? null,
      rewardStatus, claimedAt: item.rewardClaimedAt ?? null, status,
    });
  }
  return {
    complete: orders.source !== "unavailable" && activity.source !== "unavailable",
    available: orders.source !== "unavailable" || activity.source !== "unavailable",
    records: [...records.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.rewardId.localeCompare(b.rewardId)),
  };
}
