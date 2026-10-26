import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { OrdersFulfillment } from "./OrdersFulfillment";
import type { AccountOrder, AccountOrders } from "@/lib/account/orders";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} /> }));
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
  expect(screen.getByText(/Retailer shopping and shipping happen on the retailer’s site/)).toBeTruthy();
});

test("connects orders to rewards, activity and support", () => {
  render(<OrdersFulfillment state={{ source: "stored", orders: [order("fulfilled", "ready")] }} />);
  expect(screen.getByRole("link", { name: /Open gift card/ }).getAttribute("href")).toBe("/account/wallet?reward=ready-reward&rewardId=ready-reward-id");
  const card = screen.getByRole("link", { name: /Open gift card/ }).closest("article")!;
  expect(within(card).queryByRole("link", { name: /My Activity|Wallet history/ })).toBeNull();
  expect(screen.getByRole("link", { name: /Visit support/ }).getAttribute("href")).toBe("/support");
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

test("uses honest empty and unavailable states", () => {
  const empty: AccountOrders = { source: "customer-empty", orders: [] };
  const { rerender } = render(<OrdersFulfillment state={empty} />);
  expect(screen.getByText("No orders or winning rewards yet")).toBeTruthy();
  rerender(<OrdersFulfillment state={{ source: "unavailable", orders: [] }} />);
  expect(screen.getByText(/Some fulfillment records could not be verified/)).toBeTruthy();
  expect(screen.getByText("Fulfillment unavailable")).toBeTruthy();
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
  expect(screen.getByText("1 of 2 records")).toBeTruthy();
  rerender(<OrdersFulfillment state={state} overview={overview} filter="fulfilled" />);
  expect(screen.getByRole("link", { name: /Open gift card/ }).getAttribute("href")).toBe("/account/wallet?reward=ready-reward&rewardId=ready-reward-id");
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
  const journey = within(screen.getByRole("list", { name: "Gift-card fulfillment journey" }));
  expect(journey.getByRole("link", { name: /Payment confirmed/ }).getAttribute("href")).toBe("/account/orders?filter=payment#fulfillment-records");
  expect(journey.getByRole("link", { name: /Issuance/ }).getAttribute("href")).toBe("/account/orders?filter=processing#fulfillment-records");
  expect(journey.getByRole("link", { name: /Reward wallet/ }).getAttribute("href")).toBe("/account/wallet");
  expect(journey.getByRole("link", { name: /Exceptions/ }).getAttribute("href")).toBe("/account/orders?filter=exceptions#fulfillment-records");
});

test("an unknown selected reward never falls back to another customer's or product's card", () => {
  render(<OrdersFulfillment state={{ source: "stored", orders: [order("fulfilled", "ready")] }} selectedRewardId="not-owned" />);
  expect(screen.getByText("That reward is not available here")).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Open gift card" })).toBeNull();
});
