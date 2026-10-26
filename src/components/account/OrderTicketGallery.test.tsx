import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { OrderTicketGallery, orderSupportSummary } from "./OrderTicketGallery";
import type { FulfillmentRecord } from "@/lib/account/fulfillment";
import { activityHref } from "@/lib/account/activity";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";

vi.mock("next/image", () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const record = (id: number, changes: Partial<FulfillmentRecord> = {}): FulfillmentRecord => ({
  orderNumber: `order-full-reference-${id}`, rewardSlug: "same-product", rewardId: `reward-full-reference-${id}`,
  title: `Reward ${id}`, retailer: "Retailer", image: "/test.png", faceValueCents: 10000, amountPaidCents: 9900,
  status: "fulfilled", createdAt: "2026-10-26T12:00:00Z", entryId: `entry-full-reference-${id}`, source: "purchase",
  rewardStatus: "ready", claimedAt: "2026-10-26T12:00:00Z", ...changes,
});

test("mobile pages two cards; desktop pages six, without dropping repeated products", () => {
  let phone = true;
  let change = () => {};
  vi.stubGlobal("matchMedia", () => ({ matches: phone, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }));
  render(<OrderTicketGallery orders={Array.from({ length: 8 }, (_, i) => record(i + 1))} />);
  expect(screen.getAllByRole("article")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  expect(screen.getByRole("heading", { name: "Reward 3" })).toBeTruthy();
  expect(screen.getByText("3–4 of 8")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Previous tickets" }));
  act(() => { phone = false; change(); });
  expect(screen.getAllByRole("article")).toHaveLength(6);
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  expect(screen.getByText("7–8 of 8")).toBeTruthy();
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

test("details copy full references and exact checkout amounts, then return focus on close", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const order = record(1);
  render(<OrderTicketGallery orders={[order]} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  const trigger = screen.getByRole("button", { name: "Order details" });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Order details" });
  expect(screen.getByRole("button", { name: "Close details" })).toBe(document.activeElement);
  fireEvent.click(within(dialog).getByRole("button", { name: "Copy order number" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(order.orderNumber));
  fireEvent.click(within(dialog).getByRole("button", { name: "Copy for Support" }));
  await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(orderSupportSummary(order)));
  const summary = writeText.mock.calls.at(-1)![0];
  for (const value of [order.rewardId, order.entryId, order.createdAt, "Gift-card value: $100", "Paid at checkout: $99"]) expect(summary).toContain(value);
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test("a failed copy provides selectable text instead of claiming success", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
  render(<OrderTicketGallery orders={[record(1)]} />);
  fireEvent.click(screen.getByRole("button", { name: "Order details" }));
  fireEvent.click(screen.getByRole("button", { name: "Copy for Support" }));
  const text = await screen.findByRole("textbox", { name: "Details to copy" });
  expect((text as HTMLTextAreaElement).value).toContain("order-full-reference-1");
  expect(screen.queryByText("Copied. Ready to paste into Support.")).toBeNull();
});

test("used rewards stay distinguishable and open the exact same destination as My Activity", () => {
  const activity = { ...storedActivityFixture().activity[1], rewardId: "used-reward-id", rewardStatus: "redeemed" as const };
  render(<OrderTicketGallery orders={[record(1, { rewardId: activity.rewardId, rewardSlug: activity.slug, rewardStatus: "redeemed" })]} />);
  expect(screen.getByText("Already used")).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Open gift card" })).toBeNull();
  expect(screen.getByRole("link", { name: "View used card" }).getAttribute("href")).toBe(activityHref(activity));
});

test("claimed wins and purchases open their usable wallet pass, with no redundant destinations", () => {
  const purchase = record(1), win = record(2, { source: "winner", orderNumber: null, amountPaidCents: null });
  render(<OrderTicketGallery orders={[purchase, win]} />);
  expect(screen.getAllByRole("link", { name: "Open gift card" }).map(a => a.getAttribute("href"))).toEqual([
    "/account/wallet?reward=same-product&rewardId=reward-full-reference-1",
    "/account/wallet?reward=same-product&rewardId=reward-full-reference-2",
  ]);
  expect(screen.getByText("You won")).toBeTruthy();
  expect(screen.getAllByText("Paid at checkout")).toHaveLength(1);
  expect(screen.queryByRole("link", { name: /Wallet history|My Activity/ })).toBeNull();
  expect(orderSupportSummary(win)).not.toContain("Paid at checkout");
});

test("exception status and unavailable checkout amounts remain visible without inventing data", () => {
  render(<OrderTicketGallery orders={[record(1, { status: "exception", rewardStatus: "issuance_failed", amountPaidCents: null })]} />);
  expect(screen.getByText("Action needed")).toBeTruthy();
  expect(screen.getByText("Unavailable")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Order details" }));
  expect(screen.getByText(/entitlement remains recorded/)).toBeTruthy();
});
