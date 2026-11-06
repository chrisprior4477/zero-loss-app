import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import { AccountStateSync } from "./AccountStateSync";

const sync = (balanceCents = 4300) => <AccountStateSync accountId="owner" balanceCents={balanceCents} activeCount={37} />;
const tick = () => act(() => vi.advanceTimersByTime(100));
beforeEach(() => {
  vi.useFakeTimers();
  router.refresh.mockClear();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); });

test("returning to a tab coalesces focus and visibility into one server refresh", () => {
  render(sync());
  window.dispatchEvent(new Event("focus"));
  document.dispatchEvent(new Event("visibilitychange"));
  tick();
  expect(router.refresh).toHaveBeenCalledOnce();
});

test("another tab's update refreshes the route without accepting its balance", () => {
  const writes = vi.spyOn(Storage.prototype, "setItem");
  render(sync());
  window.dispatchEvent(new StorageEvent("storage", { key: "zero-loss-account-changed:someone-else", newValue: "changed" }));
  tick();
  expect(router.refresh).not.toHaveBeenCalled();
  window.dispatchEvent(new StorageEvent("storage", { key: "zero-loss-account-changed:owner", newValue: '{"balanceCents":999999}' }));
  tick();
  expect(router.refresh).toHaveBeenCalledOnce();
  expect(writes).not.toHaveBeenCalled();
});

test("server balance changes broadcast only an invalidation, unchanged refreshes do not loop", () => {
  const writes = vi.spyOn(Storage.prototype, "setItem");
  const view = render(sync());
  expect(writes).not.toHaveBeenCalled();
  view.rerender(sync(54300));
  expect(writes).toHaveBeenCalledOnce();
  expect(writes.mock.calls[0][0]).toBe("zero-loss-account-changed:owner");
  expect(writes.mock.calls[0][1]).toMatch(/^[\da-f-]{36}$/);
  view.rerender(sync(54300));
  expect(writes).toHaveBeenCalledOnce();
  expect(router.refresh).not.toHaveBeenCalled();
});

test("hidden or offline tabs wait, then refresh on return or reconnection", () => {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  const online = vi.spyOn(navigator, "onLine", "get");
  render(sync());
  window.dispatchEvent(new StorageEvent("storage", { key: "zero-loss-account-changed:owner", newValue: "changed" }));
  tick(); expect(router.refresh).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible"); online.mockReturnValue(false);
  document.dispatchEvent(new Event("visibilitychange"));
  tick(); expect(router.refresh).not.toHaveBeenCalled();
  online.mockReturnValue(true); window.dispatchEvent(new Event("online"));
  tick(); expect(router.refresh).toHaveBeenCalledOnce();
});

test("restored browser pages refresh, and unmount removes listeners and queued work", () => {
  const view = render(sync());
  window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  tick(); expect(router.refresh).toHaveBeenCalledOnce();
  window.dispatchEvent(new Event("focus"));
  view.unmount(); tick();
  window.dispatchEvent(new Event("focus")); tick();
  expect(router.refresh).toHaveBeenCalledOnce();
});

test("blocked browser storage does not prevent focus refresh", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  const view = render(sync());
  view.rerender(sync(54300));
  window.dispatchEvent(new Event("focus")); tick();
  expect(router.refresh).toHaveBeenCalledOnce();
});
