import { expect, test } from "vitest";
import type { AccountActivity, ActivityItem, RewardStatus } from "./activity";
import type { AccountOrders, AccountOrder } from "./orders";
import { accountFulfillment, fulfillmentFilter, fulfillmentHref, matchesFulfillmentFilter } from "./fulfillment";

const reward: ActivityItem = { slug: "same-product", title: "Prize", retailer: "Retailer", image: "/prize.png", status: "prize", rewardKind: "digital", entryId: "entry-1", rewardId: "reward-1", rewardSource: "winner", rewardStatus: "ready", priceCents: 2500, paidCents: 100, remainingCents: 0, availability: "Ready", enteredAt: "2026-10-23T12:00:00Z" };
const activity = (...items: ActivityItem[]): AccountActivity => ({ source: items.length ? "stored" : "customer-empty", isPreview: true, activeCount: 0, activity: items });
const empty: AccountOrders = { source: "customer-empty", orders: [] };
const purchase: AccountOrder = { orderNumber: "order-1", rewardSlug: "same-product", rewardId: "reward-1", title: "Prize", retailer: "Retailer", image: "/prize.png", status: "fulfilled", faceValueCents: 2500, amountPaidCents: 2400, createdAt: "2026-10-23T13:00:00Z" };

test("includes a saved win with no checkout and never invents an order or payment", () => {
  const result = accountFulfillment(empty, activity(reward));
  expect(result.complete).toBe(true);
  expect(result.records).toHaveLength(1);
  expect(result.records[0]).toMatchObject({ source: "winner", status: "fulfilled", entryId: "entry-1", orderNumber: null, amountPaidCents: null });
});
test("excludes open entries, unpurchased options and legacy prize fixtures without a saved reward ID", () => {
  const items = ["active", "completion", "prize"].map(status => ({ ...reward, status, rewardId: null })) as ActivityItem[];
  expect(accountFulfillment(empty, activity(...items)).records).toEqual([]);
});
test("deduplicates purchases by reward identity, not product, retaining exact checkout amount", () => {
  const result = accountFulfillment({ source: "stored", orders: [purchase] }, activity({ ...reward, status: "completed", rewardSource: "purchase" }, { ...reward, rewardId: "reward-2", entryId: "entry-2" }));
  expect(result.records).toHaveLength(2);
  expect(result.records[0]).toMatchObject({ orderNumber: "order-1", amountPaidCents: 2400, entryId: "entry-1" });
  expect(result.records[1]).toMatchObject({ rewardId: "reward-2", entryId: "entry-2", orderNumber: null });
});
test.each<readonly [RewardStatus, string, string]>([
  ["ready", "fulfilled", "fulfilled"], ["redeemed", "fulfilled", "fulfilled"],
  ["issuance_pending", "issuance_pending", "processing"], ["issuance_failed", "exception", "exceptions"],
  ["expired", "expired", "exceptions"], ["cancelled", "cancelled", "exceptions"],
])("maps reward lifecycle %s into its proper outcome", (rewardStatus, status, filter) => {
  const record = accountFulfillment(empty, activity({ ...reward, rewardStatus })).records[0];
  expect(record.status).toBe(status);
  expect(matchesFulfillmentFilter(record, fulfillmentFilter(filter))).toBe(true);
});
test.each(["payment_confirmed", "issuance_pending", "fulfilled", "exception", "cancelled", "corrected"] as const)("keeps authoritative order event %s and does not label corrections as processing", status => {
  const record = accountFulfillment({ source: "stored", orders: [{ ...purchase, status }] }, activity()).records[0];
  expect(record.status).toBe(status);
  expect(matchesFulfillmentFilter(record, "payment")).toBe(true);
  if (status === "corrected") expect(matchesFulfillmentFilter(record, "exceptions")).toBe(true);
});
test("does not hide verified wins when order service fails, or fake complete totals", () => {
  const result = accountFulfillment({ source: "unavailable", orders: [purchase] }, activity(reward));
  expect(result.complete).toBe(false);
  expect(result.records[0].orderNumber).toBeNull();
  expect(result.records).toHaveLength(1);
  expect(accountFulfillment(empty, { ...activity(reward), source: "unavailable" }).records).toEqual([]);
});
test("unknown reward status is never promoted to issued", () => {
  expect(accountFulfillment(empty, activity({ ...reward, rewardStatus: null })).records[0].status).toBe("issuance_pending");
});
test("current failed or expired reward state takes precedence over an old fulfilled order", () => {
  for (const rewardStatus of ["issuance_failed", "expired", "cancelled", "issuance_pending"] as const) {
    const record = accountFulfillment({ source: "stored", orders: [purchase] }, activity({ ...reward, rewardStatus })).records[0];
    expect(record.status).not.toBe("fulfilled");
  }
});
test.each(["payment_confirmed", "issuance_pending"] as const)("a ready wallet reward is not regressed by an older %s checkout event", status => {
  const record = accountFulfillment({ source: "stored", orders: [{ ...purchase, status }] }, activity({ ...reward, rewardSource: "purchase" })).records[0];
  expect(record.status).toBe("fulfilled");
  expect(matchesFulfillmentFilter(record, "processing")).toBe(false);
  expect(matchesFulfillmentFilter(record, "payment")).toBe(true);
});
test.each(["exception", "cancelled", "corrected"] as const)("a ready wallet does not suppress an explicit order %s", status => {
  const record = accountFulfillment({ source: "stored", orders: [{ ...purchase, status }] }, activity(reward)).records[0];
  expect(record.status).toBe(status);
  expect(matchesFulfillmentFilter(record, "exceptions")).toBe(true);
});
test("filter URLs are shareable, encoded, and reject unknown filter values", () => {
  expect(fulfillmentFilter("untrusted")).toBe("all");
  expect(fulfillmentHref("id&other=1")).toBe("/account/orders?rewardId=id%26other%3D1#fulfillment-records");
});
