import { expect, test } from "vitest";
import { storedActivityFixture } from "./activity.test-fixture";
import { buildAccountNotifications, buildOrderNotifications, notificationIsEnabled, parseNotificationPreferences } from "./notifications";
import type { RewardStatus, CompletionOptionStatus } from "./activity";
import { headerCounts } from "./header-notifications";

test("claiming one reward resolves its alert and deadline without hiding another win", () => {
  const state = storedActivityFixture();
  state.activity[1] = { ...state.activity[1], rewardId: "claimed", rewardSource: "winner", rewardStatus: "ready", rewardClaimedAt: "2026-10-25T12:00:00Z", rewardClaimExpiresAt: new Date(Date.now() + 86400000).toISOString() };
  state.activity.push({ ...state.activity[1], rewardId: "unclaimed", rewardClaimedAt: null });
  const notices = buildAccountNotifications(state, null, true);
  expect(notices.find(n => n.id === "reward-claimed")).toMatchObject({ resolved: true, action: "View gift card" });
  expect(notices.some(n => n.id === "reward-deadline-claimed")).toBe(false);
  expect(notices.some(n => n.id === "reward-deadline-unclaimed")).toBe(true);
  expect(headerCounts(notices).wins).toBe(1);
});

test("a purchased card stays in history without generating another header alert", () => {
  const state = storedActivityFixture();
  state.activity[2] = { ...state.activity[2], status: "completed", completionOptionStatus: "purchased", rewardId: "purchase", rewardSource: "purchase", rewardStatus: "ready", rewardClaimedAt: "2026-10-25T12:00:00Z" };
  const notices = buildAccountNotifications(state, null, true);
  expect(notices.find(n => n.id === "reward-purchase")).toMatchObject({ resolved: true, action: "View gift card" });
  expect(headerCounts(notices).options).toBe(1);
});

test("same-product purchase options have distinct notifications and exact entry links", () => {
  const state = storedActivityFixture();
  const first = state.activity[2];
  first.entryId = "entry-one";
  first.completionOptionId = "option-one";
  state.activity.push({ ...first, entryId: "entry-two", completionOptionId: "option-two" });

  const options = buildAccountNotifications(state, null, true).filter(notification => notification.href.includes("nike-court-shot-shoes"));
  expect(options.map(option => option.id)).toEqual(["completion-option-one", "completion-option-two"]);
  expect(options.map(option => option.href)).toEqual([
    "/account/entries?item=nike-court-shot-shoes&entry=entry-one",
    "/account/entries?item=nike-court-shot-shoes&entry=entry-two",
  ]);
});

test("email confirmation produces a new unread account notification", () => {
  const unconfirmed = buildAccountNotifications(storedActivityFixture(), null, false).find((item) => item.category === "account");
  const confirmed = buildAccountNotifications(storedActivityFixture(), null, true).find((item) => item.category === "account");
  expect(unconfirmed?.id).toBe("account-email-unconfirmed");
  expect(confirmed?.id).toBe("account-email-confirmed");
});

test.each(["expired", "cancelled", "redeemed", "issuance_pending", "issuance_failed", null] as (RewardStatus | null)[])("%s rewards never advertise a usable barcode, even when the entry is a win", status => {
  const state = storedActivityFixture();
  const reward = state.activity[1];
  reward.rewardId = "11111111-1111-4111-8111-111111111111";
  reward.rewardStatus = status;
  reward.availability = "Retailer gift card ready to claim";
  const notification = buildAccountNotifications(state, null, true).find(item => item.id.startsWith("reward-"))!;
  expect(notification.title).not.toContain("reward is ready");
  expect(notification.action).toBe("View reward details");
  expect(notification.meta).not.toContain("ready");
  expect(notification.href).toBe(`/account/wallet?reward=samsung-m70h-tv&rewardId=${reward.rewardId}`);
  expect(notification.id).toBe(`reward-${reward.rewardId}-${status ?? "unavailable"}`);
});

test("ready rewards retain exact identities and a new status does not inherit an old read receipt", () => {
  const state = storedActivityFixture();
  state.activity[1].rewardId = "reward-one";
  state.activity[1].rewardStatus = "ready";
  state.activity.push({ ...state.activity[1], rewardId: "reward-two" });
  const ready = buildAccountNotifications(state, null, true).filter(item => item.tone === "reward");
  expect(ready.map(item => item.id)).toEqual(["reward-reward-one", "reward-reward-two"]);
  expect(new Set(ready.map(item => item.href)).size).toBe(2);
  state.activity[1].rewardStatus = "expired";
  expect(buildAccountNotifications(state, null, true).find(item => item.href.includes("rewardId=reward-one"))?.id).not.toBe(ready[0].id);
});

test.each(["declined", "purchased", "expired", "cancelled"] as CompletionOptionStatus[])("%s purchase options don't ask the customer to pay again", status => {
  const state = storedActivityFixture();
  state.activity[2].completionOptionStatus = status;
  const item = buildAccountNotifications(state, null, true).find(item => item.id.endsWith(status))!;
  expect(item.action).toBe(status === "declined" ? "Review declined offers" : "View details");
  if (status === "declined") expect(item.href).toBe("/account/declined-offers");
  expect(item.body).not.toContain("Pay $");
  expect(item.id.endsWith(status)).toBe(true);
});

test("wallet updates target the exact posted transaction", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const notifications = buildAccountNotifications(storedActivityFixture(), {
    walletAccountId: id, scope: "demo", currency: "USD", fundingAvailable: true, balanceCents: 100, transactionCount: 1,
    entries: [{ id, entry_type: "DEPOSIT", amount: 100, created_at: "2026-09-21T12:00:00Z" }],
  }, true);
  expect(notifications.find(item => item.id === `wallet-${id}`)?.href).toBe(`/account/wallet?view=history&transaction=${id}#transaction-${id}`);
});

test("archived demo ledger rows do not create visible notifications", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const wallet = {
    walletAccountId: id, scope: "demo" as const, currency: "USD" as const, fundingAvailable: true,
    balanceCents: 0, transactionCount: 1,
    entries: [{ id, entry_type: "DEPOSIT", amount: 100, created_at: "2026-09-21T12:00:00Z" }],
  };
  expect(buildAccountNotifications(storedActivityFixture(), wallet, true, [id]).some(item => item.id === `wallet-${id}`)).toBe(false);
});

test("the Orders filter is backed by exact fulfillment records", () => {
  const [notice] = buildOrderNotifications([{
    orderNumber: "ord_1234567890abcdef", rewardSlug: "netflix-25-gift-card",
    rewardId: "11111111-1111-4111-8111-111111111111", title: "$25 Netflix Gift Card",
    retailer: "Netflix", image: "/netflix.png", faceValueCents: 2500,
    amountPaidCents: 2400, status: "fulfilled", createdAt: "2026-10-17T18:00:00Z",
  }]);
  expect(notice.category).toBe("orders");
  expect(notice.title).toBe("Netflix gift card issued");
  expect(notice.href).toBe("/account/orders?order=ord_1234567890abcdef#order-ord_1234567890abcdef");
  expect(notificationIsEnabled(notice, parseNotificationPreferences({ order_updates: false }))).toBe(false);
  expect(notificationIsEnabled(notice, parseNotificationPreferences({ order_updates: true }))).toBe(true);
});
