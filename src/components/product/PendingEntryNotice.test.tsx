import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ list: vi.fn(), resolve: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/items/test-prize", useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/entries/actions", () => ({ listPendingEntryRequests: mocks.list, resolvePendingEntryRequest: mocks.resolve }));
import { PendingEntryNotice } from "./PendingEntryNotice";
import { ENTRY_REQUEST_EVENT, type EntryRequest } from "@/lib/entries/request";
const request: EntryRequest = { requestId: "41414141-4141-4141-8141-414141414141", slug: "test-prize", title: "Test prize", quantity: 3, amountCents: 300, status: "pending", undoUntil: "2026-09-21T12:00:30Z", serverNow: "2026-09-21T12:00:00Z", href: null };
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); mocks.list.mockResolvedValue({ requests: [request] }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

test("restores pending entries after navigation, with exact quantity and a website-styled Undo", async () => {
  render(<PendingEntryNotice />);
  expect(await screen.findByRole("button", { name: "Undo all entries" })).toBeTruthy();
  expect(screen.getByText("3 tickets · $3 reserved")).toBeTruthy();
  expect(screen.getByText("30s")).toBeTruthy();
  expect(screen.getByText(/not your payment card/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Dismiss/ })).toBeNull();
  expect(mocks.resolve).not.toHaveBeenCalled();
});
test("Undo waits for the server, restores the receipt, and never pretends a network failure succeeded", async () => {
  mocks.resolve.mockResolvedValueOnce({ error: "Connection interrupted." }).mockResolvedValueOnce({ request: { ...request, status: "cancelled" } });
  render(<PendingEntryNotice />);
  fireEvent.click(await screen.findByRole("button", { name: "Undo all entries" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Connection interrupted.");
  expect(screen.queryByText("Entry undone")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Undo all entries" }));
  expect(await screen.findByText("Entry undone")).toBeTruthy();
  expect(mocks.resolve).toHaveBeenLastCalledWith(request.requestId, true);
  expect(screen.getByText(/\$3 returned to Playable Balance/)).toBeTruthy();
});
test("deadline expiration checks the server instead of granting a client-side result", async () => {
  mocks.list.mockResolvedValue({ requests: [{ ...request, serverNow: request.undoUntil }] });
  mocks.resolve.mockResolvedValue({ request: { ...request, status: "accepted", href: "/account/entries?entry=ent_abcd" } });
  render(<PendingEntryNotice />);
  const link = await screen.findByRole("link", { name: "View entries →" });
  expect(mocks.resolve).toHaveBeenCalledWith(request.requestId, false);
  expect(link.getAttribute("href")).toBe("/account/entries?entry=ent_abcd");
  expect(screen.queryByRole("button", { name: "Undo all entries" })).toBeNull();
});
test("receipts published by submission appear without leaving the prize page", async () => {
  mocks.list.mockResolvedValue({ requests: [] });
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: request })));
  expect(screen.getByRole("button", { name: "Undo all entries" })).toBeTruthy();
});
test("signed-out visitors see no other customer's receipts", async () => {
  mocks.list.mockResolvedValue({ requests: [] });
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  expect(screen.queryByRole("region", { name: "Entry confirmations" })).toBeNull();
});
