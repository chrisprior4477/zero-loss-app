import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ list: vi.fn(), resolve: vi.fn(), acknowledge: vi.fn(), refresh: vi.fn(), replace: vi.fn(), path: "/items/test-prize" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.path, useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }) }));
vi.mock("@/lib/entries/actions", () => ({ listPendingEntryRequests: mocks.list, resolvePendingEntryRequest: mocks.resolve, acknowledgeEntryReceipt: mocks.acknowledge }));
import { PendingEntryNotice } from "./PendingEntryNotice";
import { ENTRY_REQUEST_CREATED_EVENT, ENTRY_REQUEST_EVENT, RECENT_ENTRY_STORAGE_KEY, type EntryRequest } from "@/lib/entries/request";
const request: EntryRequest = { requestId: "41414141-4141-4141-8141-414141414141", slug: "test-prize", title: "Test prize", quantity: 3, amountCents: 300, status: "pending", duplicate: false, undoUntil: "2026-09-21T12:00:30Z", serverNow: "2026-09-21T12:00:00Z", href: null };
beforeEach(() => { vi.resetAllMocks(); mocks.path = "/items/test-prize"; sessionStorage.clear(); mocks.list.mockResolvedValue({ requests: [] }); mocks.acknowledge.mockResolvedValue({}); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

test("does not render either the countdown or View entry toast", async () => {
  mocks.list.mockResolvedValue({ requests: [request] });
  const { container } = render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  expect(container.firstChild).toBeNull();
});

test("local accepted entry returns to My Activity and leaves a transient exact-entry marker", async () => {
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  act(() => {
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: request.requestId }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: request }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...request, status: "accepted", href: "/account/entries?item=test-prize&entry=ent_abcd" } }));
  });
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account/entries"));
  expect(JSON.parse(sessionStorage.getItem(RECENT_ENTRY_STORAGE_KEY) ?? "null")).toMatchObject({ slug: "test-prize", entryId: "ent_abcd" });
  expect(mocks.acknowledge).toHaveBeenCalledWith(request.requestId);
});

test("restored older receipt is acknowledged without redirecting", async () => {
  mocks.list.mockResolvedValue({ requests: [{ ...request, status: "accepted", href: "/account/entries" }] });
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.acknowledge).toHaveBeenCalledWith(request.requestId));
  expect(mocks.replace).not.toHaveBeenCalled();
});

test("expired pending request is checked with the server, not accepted by the browser", async () => {
  mocks.list.mockResolvedValue({ requests: [{ ...request, serverNow: request.undoUntil }] });
  mocks.resolve.mockResolvedValue({ request: { ...request, status: "accepted", href: "/account/entries" } });
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.resolve).toHaveBeenCalledWith(request.requestId, false));
  expect(mocks.replace).not.toHaveBeenCalled();
});
