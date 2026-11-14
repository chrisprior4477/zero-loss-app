import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { OrdersFulfillment } from "./OrdersFulfillment";
import type { AccountOrder, AccountOrders } from "@/lib/account/orders";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} /> }));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(cleanup);

const order = (status: AccountOrder["status"], suffix: string): AccountOrder => ({
  orderNumber: `ord_${suffix}`,
  rewardSlug: `${suffix}-reward`,
  rewardId: `${suffix}-reward-id`,
  title: `${suffix} gift card`,
  retailer: `${suffix} retailer`,
  image: `/products/${suffix}.png`,
  faceValueCents: 7500,
  amountPaidCents: 7400,
  status,
  createdAt: "2026-09-18T12:00:00Z",
});

test("shows only real retailer gift-card orders", () => {
  const state: AccountOrders = { source: "stored", orders: [order("issuance_pending", "pending"), order("fulfilled", "ready"), order("exception", "exception")] };
  render(<OrdersFulfillment state={state} />);
  expect(screen.getByRole("heading", { name: "Orders & Fulfillment" })).toBeTruthy();
  expect(screen.getByText("pending gift card")).toBeTruthy();
  expect(screen.getByText("ready gift card")).toBeTruthy();
  expect(screen.getByText("exception gift card")).toBeTruthy();
  expect(screen.queryByText(/UPS|FedEx|USPS|estimated delivery:/i)).toBeNull();
  expect(screen.getByText(/checkout, shipping and retailer fees remain on the retailer’s site/)).toBeTruthy();
});

test("identifies repeat payments by their actual checkout date and order number", () => {
  const first = order("fulfilled", "FIRST123");
  const second = { ...first, orderNumber: "ord_SECOND12", rewardId: "second", createdAt: "2026-09-19T12:00:00Z" };
  const otherPrice = { ...first, orderNumber: "ord_OTHER123", rewardId: "different-price", amountPaidCents: 7300 };
  render(<OrdersFulfillment state={{ source: "stored", orders: [first, second, otherPrice] }} filter="payment" />);
  expect(within(screen.getByText("#FIRST123").closest("article")!).getByText("Purchased Sep 18")).toBeTruthy();
  expect(within(screen.getByText("#SECOND12").closest("article")!).getByText("Purchased Sep 19")).toBeTruthy();
  expect(screen.queryByText("#OTHER123")).toBeNull();
});

test("connects orders to rewards, activity and support", () => {
  render(<OrdersFulfillment state={{ source: "stored", orders: [order("fulfilled", "ready")] }} />);
  expect(screen.getByRole("link", { name: /Open gift card/ }).getAttribute("href")).toBe("/account/wallet?reward=ready-reward&rewardId=ready-reward-id");
  const card = screen.getByRole("link", { name: /Open gift card/ }).closest("article")!;
  expect(within(card).queryByRole("link", { name: /My Activity|Wallet history/ })).toBeNull();
  const helpLinks = screen.getAllByRole("link", { name: "Choose a transaction to report" });
  expect(helpLinks).toHaveLength(2);
  for (const link of helpLinks) expect(link.getAttribute("href")).toBe("/account/wallet?view=history#transactions");
  const related = within(screen.getByRole("navigation", { name: "Related pages" }));
  expect(related.getAllByRole("link").map(link => [link.textContent, link.getAttribute("href")])).toEqual([
    ["My Activity", "/account/entries"],
    ["Gift Cards & Rewards", "/account/wallet"],
    ["Wallet & Transactions", "/account/wallet?view=history"],
    ["Confirmed payments", "/account/orders?filter=payment#fulfillment-records"],
  ]);
});

test("both order help links open the selected transaction's problem form", () => {
  const supportHref = "/support?transaction=11111111-1111-4111-8111-111111111111#report-problem";
  render(<OrdersFulfillment state={{ source: "stored", orders: [order("fulfilled", "ready")] }} selectedOrderNumber="ord_ready" supportHref={supportHref} />);
  const helpLinks = screen.getAllByRole("link", { name: "Report a problem with this order" });
  expect(helpLinks).toHaveLength(2);
  for (const link of helpLinks) expect(link.getAttribute("href")).toBe(supportHref);
});

test("both confirmed payment links open checkout records and the filter can be cleared", () => {
  const activity = storedActivityFixture();
  activity.activity = [{ ...activity.activity[1], entryId: "ent_winner", rewardId: "winner-id", rewardSource: "winner", rewardStatus: "ready" }];
  const overview = { balanceLabel: "$17", fundingEnabled: true, activity };
  const state: AccountOrders = { source: "stored", orders: [order("fulfilled", "purchased"), order("issuance_pending", "pending")] };
  const { rerender } = render(<OrdersFulfillment state={state} overview={overview} />);
  const header = screen.getByRole("heading", { name: "Retailer gift-card fulfillment" }).closest("header")!;
  const related = screen.getByRole("navigation", { name: "Related pages" });
  for (const parent of [header, related]) {
    expect(within(parent).getByRole("link", { name: "Confirmed payments" }).getAttribute("href")).toBe("/account/orders?filter=payment#fulfillment-records");
  }
  expect(screen.getByText("You won")).toBeTruthy();
  expect(within(header).getByRole("status").textContent).toBe("3 records");

  rerender(<OrdersFulfillment state={state} overview={overview} filter="payment" />);
  expect(within(header).getByRole("status").textContent).toBe("2 paid orders");
  expect(screen.getByText(/this view shows paid orders only/i)).toBeTruthy();
  expect(within(header).getByRole("link", { name: "Confirmed payments" }).getAttribute("aria-current")).toBe("page");
  expect(within(related).getByRole("link", { name: "Confirmed payments" }).getAttribute("href")).toBe("/account/orders?filter=payment#fulfillment-records");
  expect(screen.getByText("purchased gift card")).toBeTruthy();
  expect(screen.getByText("pending gift card")).toBeTruthy();
  expect(screen.queryByText("You won")).toBeNull();
  expect(within(header).getByRole("link", { name: "Show all orders & rewards" }).getAttribute("href")).toBe("/account/orders#fulfillment-records");
});

test("two orders for the same product open their own saved gift cards", () => {
  render(<OrdersFulfillment state={{ source: "stored", orders: [
    order("fulfilled", "ready"),
    { ...order("fulfilled", "second"), rewardSlug: "ready-reward" },
  ] }} />);
  expect(screen.getAllByRole("link", { name: /Open gift card/ }).map(link => link.getAttribute("href"))).toEqual([
    "/account/wallet?reward=ready-reward&rewardId=ready-reward-id",
    "/account/wallet?reward=ready-reward&rewardId=second-reward-id",
  ]);
});

test("repairs a duplicate fulfillment fragment without clearing the filter", () => {
  const previousHref = window.location.href;
  const previousState = window.history.state;
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  try {
    window.history.replaceState({ saved: true }, "", "/account/orders?filter=payment#fulfillment-records#fulfillment-records");
    render(<OrdersFulfillment state={{ source: "stored", orders: [order("fulfilled", "purchased")] }} filter="payment" />);
    expect(window.location.search).toBe("?filter=payment");
    expect(window.location.hash).toBe("#fulfillment-records");
    expect(window.history.state).toEqual({ saved: true });
    expect(screen.getByText("1 paid order")).toBeTruthy();
  } finally {
    cleanup();
    scrollTo.mockRestore();
    window.history.replaceState(previousState, "", previousHref);
  }
});

test("uses honest empty and unavailable states", () => {
  const empty: AccountOrders = { source: "customer-empty", orders: [] };
  const { rerender } = render(<OrdersFulfillment state={empty} />);
  expect(screen.getByText("No orders or winning rewards yet")).toBeTruthy();
  rerender(<OrdersFulfillment state={{ source: "unavailable", orders: [] }} />);
  expect(screen.getByText("Fulfillment unavailable")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});

test.each([
  { selection: { selectedOrderNumber: "ord_target" }, retry: "Try this order again", failure: "We couldn’t load this order right now" },
  { selection: { selectedRewardId: "target-reward-id" }, retry: "Try this reward again", failure: "We couldn’t load this reward right now" },
  { selection: { filter: "exceptions" as const }, retry: "Try Exceptions again", failure: "We couldn’t load Exceptions right now" },
  { selection: { filter: "payment" as const }, retry: "Try again", failure: "Fulfillment unavailable" },
])("retries the same fulfillment view with $retry", ({ selection, retry, failure }) => {
  refresh.mockClear();
  const { rerender } = render(<OrdersFulfillment state={{ source: "unavailable", orders: [] }} {...selection} />);
  expect(screen.getByRole("heading", { name: failure })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "View all orders" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: retry }));
  expect(refresh).toHaveBeenCalledTimes(1);
  rerender(<OrdersFulfillment state={{ source: "stored", orders: [order("exception", "target")] }} {...selection} />);
  expect(screen.getByRole("heading", { name: "target gift card" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: retry })).toBeNull();
});

test("a partial response keeps verified records visible and can retry missing data", () => {
  const activity = storedActivityFixture();
  activity.activity = [{ ...activity.activity[1], entryId: "ent_winner", rewardId: "winner-id", rewardSource: "winner", rewardStatus: "ready" }];
  render(<OrdersFulfillment state={{ source: "unavailable", orders: [] }} selectedRewardId="winner-id" overview={{ balanceLabel: "$17", fundingEnabled: true, activity }} />);
  expect(screen.getByText(/Some fulfillment records could not be verified/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try this reward again" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "View winning reward" })).toBeTruthy();
});

test("ticket filters use actual order statuses without changing saved destinations", () => {
  const state: AccountOrders = { source: "stored", orders: [order("issuance_pending", "pending"), order("fulfilled", "ready")] };
  const overview = { balanceLabel: "$17", fundingEnabled: false, activity: storedActivityFixture() };
  const { rerender } = render(<OrdersFulfillment state={state} overview={overview} />);
  expect(screen.getByRole("link", { name: "Playable Wallet: $17" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /In progress:/ }).getAttribute("href")).toBe("/account/orders?filter=processing#fulfillment-records");
  rerender(<OrdersFulfillment state={state} overview={overview} filter="processing" />);
  expect(screen.getByRole("heading", { name: "pending gift card" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "ready gift card" })).toBeNull();
  expect(screen.getByText("1 record")).toBeTruthy();
  rerender(<OrdersFulfillment state={state} overview={overview} filter="fulfilled" />);
  expect(screen.getByRole("link", { name: /Open gift card/ }).getAttribute("href")).toBe("/account/wallet?reward=ready-reward&rewardId=ready-reward-id&orderFilter=fulfilled");
  rerender(<OrdersFulfillment state={state} overview={overview} filter="exceptions" />);
  expect(screen.getByText("No records in this status")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Show all records" }).getAttribute("href")).toBe("/account/orders#fulfillment-records");
});

test("winning rewards appear without a purchase order and link to the exact activity card", () => {
  const activity = storedActivityFixture();
  activity.activity = [{ ...activity.activity[1], entryId: "ent_winner", rewardId: "winner-id", rewardSource: "winner", rewardStatus: "ready" }];
  render(<OrdersFulfillment state={{ source: "customer-empty", orders: [] }} overview={{ balanceLabel: "$17", fundingEnabled: true, activity }} />);
  expect(screen.getByRole("link", { name: "Issued: 1 record" })).toBeTruthy();
  expect(screen.getByText("Ready to claim")).toBeTruthy();
  expect(screen.getByText("You won")).toBeTruthy();
  expect(screen.queryByText("No purchase required")).toBeNull();
  expect(screen.getByRole("link", { name: "View winning reward" }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv&rewardId=winner-id");
});

test("an unknown selected reward never falls back to another customer's or product's card", () => {
  render(<OrdersFulfillment state={{ source: "stored", orders: [order("fulfilled", "ready")] }} selectedRewardId="not-owned" />);
  expect(screen.getByText("That reward is not available here")).toBeTruthy();
  expect(screen.getByRole("link", { name: "View all orders" }).getAttribute("href")).toBe("/account/orders#fulfillment-records");
  expect(screen.queryByRole("button", { name: "Try this reward again" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Open gift card" })).toBeNull();
});
