import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { OrdersFulfillment } from "./OrdersFulfillment";
import type { AccountOrder, AccountOrders } from "@/lib/account/orders";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} /> }));
afterEach(cleanup);

const order = (status: AccountOrder["status"], suffix: string): AccountOrder => ({
  orderNumber: `ord_${suffix}`,
  rewardSlug: `${suffix}-reward`,
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
  expect(screen.getByRole("link", { name: /Open gift card/ }).getAttribute("href")).toBe("/account/wallet?reward=ready-reward");
  expect(screen.getByRole("link", { name: /View in My Activity/ }).getAttribute("href")).toBe("/account/entries");
  expect(screen.getByRole("link", { name: /Visit support/ }).getAttribute("href")).toBe("/support");
});

test("uses honest empty and unavailable states", () => {
  const empty: AccountOrders = { source: "customer-empty", orders: [] };
  const { rerender } = render(<OrdersFulfillment state={empty} />);
  expect(screen.getByText("No retailer gift-card orders yet")).toBeTruthy();
  rerender(<OrdersFulfillment state={{ source: "unavailable", orders: [] }} />);
  expect(screen.getByRole("status").textContent).toMatch(/could not be verified/i);
  expect(screen.getByText("Orders unavailable")).toBeTruthy();
});
