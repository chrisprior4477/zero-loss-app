import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { OrdersFulfillment } from "./OrdersFulfillment";
import type { AccountActivity, ActivityItem } from "@/lib/account/activity";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} /> }));
afterEach(cleanup);

const item = (status: ActivityItem["status"], slug: string): ActivityItem => ({
  slug,
  title: `${slug} product`,
  retailer: `${slug} retailer`,
  image: `/products/${slug}.png`,
  status,
  rewardKind: "digital",
  priceCents: 7500,
  paidCents: 100,
  remainingCents: 7400,
  availability: "Ready in preview",
});

test("shows only authenticated activity that has entered fulfillment", () => {
  const state: AccountActivity = { isPreview: true, source: "stored", activeCount: 1, activity: [item("active", "console"), item("prize", "shoes"), item("completion", "television"), item("completed", "bundle")] };
  render(<OrdersFulfillment state={state} />);
  expect(screen.getByRole("heading", { name: "Orders & Fulfillment" })).toBeTruthy();
  expect(screen.queryByText("console product")).toBeNull();
  expect(screen.getByText("shoes product")).toBeTruthy();
  expect(screen.getByText("television product")).toBeTruthy();
  expect(screen.getByText("bundle product")).toBeTruthy();
  expect(screen.queryByText(/UPS|FedEx|USPS|estimated delivery:/i)).toBeNull();
});

test("connects each real outcome to its correct next step", () => {
  const state: AccountActivity = { isPreview: true, source: "stored", activeCount: 0, activity: [item("prize", "shoes"), item("completion", "television"), item("completed", "bundle")] };
  render(<OrdersFulfillment state={state} />);
  expect(screen.getByRole("link", { name: /Open reward/ }).getAttribute("href")).toBe("/account/wallet?reward=shoes");
  expect(screen.getByRole("link", { name: /Review purchase/ }).getAttribute("href")).toBe("/account/entries?item=television");
  expect(screen.getByRole("link", { name: /View details/ }).getAttribute("href")).toBe("/account/entries?item=bundle");
  expect(screen.getByRole("link", { name: /Visit support/ }).getAttribute("href")).toBe("/support");
});

test("uses honest empty and unavailable states", () => {
  const empty: AccountActivity = { isPreview: true, source: "customer-empty", activeCount: 0, activity: [] };
  const { rerender } = render(<OrdersFulfillment state={empty} />);
  expect(screen.getByText("Nothing needs fulfillment yet")).toBeTruthy();
  rerender(<OrdersFulfillment state={{ ...empty, source: "unavailable" }} />);
  expect(screen.getByRole("status").textContent).toMatch(/could not be verified/i);
  expect(screen.getByText("Orders unavailable")).toBeTruthy();
});
