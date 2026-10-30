import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { AccountOrder } from "@/lib/account/orders";
import { buildOrderNotifications } from "@/lib/account/notifications";
import LiveAccountSection from "./page";

const mocks = vi.hoisted(() => ({ account: vi.fn(), support: vi.fn(), db: {} }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.db }));
vi.mock("@/lib/account/order-support", () => ({ getOrderSupportHref: mocks.support, walletTransactionHelpHref: "/account/wallet?view=history#transactions" }));
vi.mock("@/components/account/AccountSecurityDashboard", () => ({ AccountSecurityDashboard: () => null }));
vi.mock("next/image", () => ({ default: () => null }));

const orders: AccountOrder[] = Array.from({ length: 9 }, (_, index) => ({
  orderNumber: `ord_full-reference-${index}`, rewardSlug: index < 2 ? "same-product" : `product-${index}`,
  rewardId: `reward-${index}`, title: index < 2 ? "Repeated product" : `Gift card ${index}`,
  retailer: index < 2 ? "Best Buy" : "Walmart", image: "/test.png",
  faceValueCents: 40000, amountPaidCents: 39900, status: "fulfilled",
  createdAt: `2026-10-${29 - index}T12:00:00Z`,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.support.mockResolvedValue("/support?transaction=11111111-1111-4111-8111-111111111111#report-problem");
  mocks.account.mockResolvedValue({
    userId: "owner", wallet: { scope: "demo" },
    orders: { source: "stored", orders }, balanceLabel: "$100", fundingEnabled: true,
    activity: { source: "stored", isPreview: false, activeCount: 0, activity: [] },
  });
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openOrderNotification(order: AccountOrder) {
  const [notification] = buildOrderNotifications([order]);
  const url = new URL(notification.href, "https://example.com");
  render(await LiveAccountSection({ params: Promise.resolve({ section: "orders" }), searchParams: Promise.resolve(Object.fromEntries(url.searchParams)) }));
  return url;
}

test.each([0, 1, 5, 8])("notification for order %i opens its exact gift card, including repeated products and later pages", async index => {
  const order = orders[index];
  const url = await openOrderNotification(order);
  expect(within(screen.getByRole("region", { name: "Retailer gift-card fulfillment" })).getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Open gift card" }).getAttribute("href"))
    .toBe(`/account/wallet?reward=${order.rewardSlug}&rewardId=${order.rewardId}`);
  expect(document.getElementById(decodeURIComponent(url.hash.slice(1)))).toBeTruthy();
  expect(screen.getByText("SELECTED ORDER")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.support).toHaveBeenCalledWith(mocks.db, "owner", order.orderNumber);
  expect(screen.getByRole("link", { name: "Get help" }).getAttribute("href"))
    .toBe("/support?transaction=11111111-1111-4111-8111-111111111111#report-problem");
  expect(screen.getByRole("link", { name: "Show all orders & rewards" }).getAttribute("href"))
    .toBe("/account/orders#fulfillment-records");
});

test("an old pending notice opens that order's current fulfilled record", async () => {
  await openOrderNotification({ ...orders[8], status: "issuance_pending" });
  expect(screen.getByText("Card issued")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Open gift card" }).getAttribute("href"))
    .toContain("rewardId=reward-8");
});

test("an unknown order never falls back to a different saved card", async () => {
  await openOrderNotification({ ...orders[0], orderNumber: "ord_not-owned" });
  expect(screen.getByText("That order is not available here")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "Retailer gift-card fulfillment" })).queryByRole("article")).toBeNull();
  expect(screen.queryByRole("link", { name: "Open gift card" })).toBeNull();
  expect(mocks.support).not.toHaveBeenCalled();
});

test("ordinary Orders navigation still shows the full paginated list", async () => {
  render(await LiveAccountSection({ params: Promise.resolve({ section: "orders" }) }));
  expect(within(screen.getByRole("region", { name: "Retailer gift-card fulfillment" })).getAllByRole("article")).toHaveLength(2);
  expect(screen.getByText("1–2 of 9")).toBeTruthy();
  expect(screen.queryByText("SELECTED ORDER")).toBeNull();
  expect(mocks.support).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "Get help" }).getAttribute("href")).toBe("/account/wallet?view=history#transactions");
});

test("an exact reward selection resolves its own order, while mismatched selections do not", async () => {
  const page = await LiveAccountSection({ params: Promise.resolve({ section: "orders" }), searchParams: Promise.resolve({ rewardId: orders[8].rewardId }) });
  const { unmount } = render(page);
  expect(mocks.support).toHaveBeenCalledWith(mocks.db, "owner", orders[8].orderNumber);
  unmount();
  mocks.support.mockClear();
  render(await LiveAccountSection({ params: Promise.resolve({ section: "orders" }), searchParams: Promise.resolve({ order: orders[0].orderNumber, rewardId: orders[8].rewardId }) }));
  expect(mocks.support).not.toHaveBeenCalled();
});
