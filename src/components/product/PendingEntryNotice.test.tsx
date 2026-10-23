import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ list: vi.fn(), resolve: vi.fn(), acknowledge: vi.fn(), refresh: vi.fn(), replace: vi.fn(), path: "/items/test-prize" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.path, useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }) }));
vi.mock("@/lib/entries/actions", () => ({ listPendingEntryRequests: mocks.list, resolvePendingEntryRequest: mocks.resolve, acknowledgeEntryReceipt: mocks.acknowledge }));
vi.mock("@/lib/sharing/actions", () => ({ getProductShareItem: async () => null }));
import { PRODUCT_SHARE_EVENT, shareDismissalKey } from "@/lib/sharing/product-share";
import { PendingEntryNotice as AccountPendingEntryNotice } from "./PendingEntryNotice";
const PendingEntryNotice = ({ accountId = "test" }: { accountId?: string }) => <AccountPendingEntryNotice accountId={accountId} />;
import { ENTRY_REQUEST_CREATED_EVENT, ENTRY_REQUEST_EVENT, ENTRY_REQUEST_ROUTED_EVENT, RECENT_ENTRY_STORAGE_KEY, type EntryRequest } from "@/lib/entries/request";
const request: EntryRequest = { requestId: "41414141-4141-4141-8141-414141414141", slug: "test-prize", title: "Test prize", quantity: 3, amountCents: 300, status: "pending", duplicate: false, undoUntil: "2026-09-21T12:00:30Z", serverNow: "2026-09-21T12:00:00Z", href: null };
beforeEach(() => { vi.resetAllMocks(); mocks.path = "/items/test-prize"; sessionStorage.clear(); mocks.list.mockResolvedValue({ requests: [] }); mocks.acknowledge.mockResolvedValue({}); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

test("does not render either the countdown or View entry toast", async () => {
  mocks.list.mockResolvedValue({ requests: [request] });
  const { container } = render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  expect(container.firstChild).toBeNull();
});

test("dismissal suppresses new entries for this item in this tab, but manual Share still opens", async () => {
  render(<PendingEntryNotice accountId="account-a" />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  const accepted = { ...request, status: "accepted", href: "/account/entries?item=test-prize" };
  act(() => { window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: request.requestId })); window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: accepted })); });
  fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
  expect(sessionStorage.getItem(shareDismissalKey("account-a", request.slug))).toBe("1");
  const next = { ...accepted, requestId: "51515151-5151-4151-8151-515151515151" };
  act(() => { window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: next.requestId })); window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: next })); });
  await waitFor(() => expect(mocks.acknowledge).toHaveBeenCalledWith(next.requestId));
  expect(screen.queryByRole("heading", { name: /Would you like to share this/ })).toBeNull();
  const replacements = mocks.replace.mock.calls.length;
  act(() => window.dispatchEvent(new CustomEvent(PRODUCT_SHARE_EVENT, { detail: { slug: request.slug, title: request.title } })));
  fireEvent.click(await screen.findByRole("button", { name: "Close sharing toast" }));
  expect(mocks.replace).toHaveBeenCalledTimes(replacements);
});

test("stored dismissal survives remount but does not suppress another account or product", async () => {
  sessionStorage.setItem(shareDismissalKey("account-a", request.slug), "1");
  render(<PendingEntryNotice accountId="account-b" />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  act(() => { window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: request.requestId })); window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...request, status: "accepted" } })); });
  expect(await screen.findByRole("heading", { name: /Would you like to share this/ })).toBeTruthy();
});

test("local accepted entry returns to My Activity and leaves a transient exact-entry marker", async () => {
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  act(() => {
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: request.requestId }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: request }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...request, status: "accepted", href: "/account/entries?item=test-prize&entry=ent_abcd" } }));
  });
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account/entries?item=test-prize&entry=ent_abcd"));
  expect(JSON.parse(sessionStorage.getItem(RECENT_ENTRY_STORAGE_KEY) ?? "null")).toMatchObject({ slug: "test-prize", entryId: "ent_abcd" });
  expect(mocks.acknowledge).toHaveBeenCalledWith(request.requestId);
  expect(screen.getByRole("heading", { name: /Would you like to share this/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Not now" }));
  act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...request, status: "accepted" } })));
  expect(screen.queryByRole("heading", { name: /Would you like to share this/ })).toBeNull();
});

test("an accepted close-out goes straight to its purchase option", async () => {
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  act(() => {
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: request.requestId }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: request }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...request, status: "accepted",
      href: "/account/entries?filter=completion&item=dunkin-25-gift-card&entry=ent_abcd" } }));
  });
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account/entries?filter=completion&item=dunkin-25-gift-card&entry=ent_abcd"));
});

test("an accepted scripted winner goes straight to its wallet reward", async () => {
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  act(() => {
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: request.requestId }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: request }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...request, status: "accepted",
      href: "/account/wallet?reward=dunkin-25-gift-card&rewardId=11111111-1111-4111-8111-111111111111" } }));
  });
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account/wallet?reward=dunkin-25-gift-card&rewardId=11111111-1111-4111-8111-111111111111"));
});

test("restored older receipt is acknowledged without redirecting", async () => {
  mocks.list.mockResolvedValue({ requests: [{ ...request, status: "accepted", href: "/account/entries" }] });
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.acknowledge).toHaveBeenCalledWith(request.requestId));
  expect(mocks.replace).not.toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: /Would you like to share this/ })).toBeNull();
});

test.each(["cancelled", "rejected"])("%s entries never show a sharing prompt", async status => {
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  act(() => {
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: request.requestId }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...request, status } }));
  });
  await waitFor(() => expect(mocks.acknowledge).toHaveBeenCalled());
  expect(screen.queryByRole("heading", { name: /Would you like to share this/ })).toBeNull();
});

test("expired pending request is checked with the server, not accepted by the browser", async () => {
  mocks.list.mockResolvedValue({ requests: [{ ...request, serverNow: request.undoUntil }] });
  mocks.resolve.mockResolvedValue({ request: { ...request, status: "accepted", href: "/account/entries" } });
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.resolve).toHaveBeenCalledWith(request.requestId, false));
  expect(mocks.replace).not.toHaveBeenCalled();
});

test("automatic confirmation navigates before a refresh can hide the result", async () => {
  mocks.list.mockResolvedValue({ requests: [] });
  mocks.resolve.mockResolvedValue({ request: { ...request, status: "accepted",
    href: "/account/entries?filter=completion&item=dunkin-25-gift-card&entry=ent_abcd" } });
  render(<PendingEntryNotice />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  act(() => {
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: request.requestId }));
    window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...request, serverNow: request.undoUntil } }));
  });
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account/entries?filter=completion&item=dunkin-25-gift-card&entry=ent_abcd"));
});

test("automatic confirmation does not refresh over an Activity-detail redirect", async () => {
  mocks.resolve.mockResolvedValue({ request: { ...request, status: "accepted",
    href: "/account/entries?filter=completion&item=dunkin-25-gift-card&entry=ent_abcd" } });
  const onReceipt = (event: Event) => {
    const updated = (event as CustomEvent<EntryRequest>).detail;
    if (updated.status === "accepted") window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_ROUTED_EVENT, { detail: updated.requestId }));
  };
  window.addEventListener(ENTRY_REQUEST_EVENT, onReceipt);
  try {
    render(<PendingEntryNotice />);
    await waitFor(() => expect(mocks.list).toHaveBeenCalled());
    act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...request, serverNow: request.undoUntil } })));
    await waitFor(() => expect(mocks.resolve).toHaveBeenCalledWith(request.requestId, false));
    await waitFor(() => expect(mocks.acknowledge).toHaveBeenCalledWith(request.requestId));
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener(ENTRY_REQUEST_EVENT, onReceipt);
  }
});
