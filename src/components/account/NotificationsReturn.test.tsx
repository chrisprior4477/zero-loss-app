import type { AnchorHTMLAttributes } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { AccountNotification } from "@/lib/account/notifications";
import { notificationReturnKey, readNotificationReturn, type NotificationReturn } from "@/lib/account/notification-return";
import { NotificationsCenter } from "./NotificationsCenter";

const actions = vi.hoisted(() => ({ push: vi.fn(), mark: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: actions.push, refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) =>
  <a {...props} onClick={event => { onClick?.(event); event.preventDefault(); }} /> }));
vi.mock("@/lib/crew/actions", () => ({ respondToCrewRequest: vi.fn() }));
vi.mock("@/lib/account/notification-read-actions", () => ({ markNotificationsRead: actions.mark }));
vi.mock("@/lib/account/notification-preference-actions", () => ({ setInAppAlertPreference: vi.fn() }));

const href = "/account/notifications";
const orders: AccountNotification[] = Array.from({ length: 30 }, (_, i) => ({
  id: `order-${i}`, category: "orders", tone: "order", title: `Order ${i} issued`, body: "Your gift card is ready.",
  meta: `Order ${i}`, action: "View exact order", href: `/account/orders?order=order-${i}#order-order-${i}`,
}));
const entry: AccountNotification = { ...orders[0], id: "entry", category: "activity", tone: "active", title: "My entries", itemSlug: "tv", itemTitle: "TV", entryId: "entry", action: "See entry", href: "/account/entries/entry" };
const data = [...orders, entry, { ...entry, id: "entry-2", entryId: "entry-2", href: "/account/entries/entry-2" }];
function Page({ userId = "owner", notifications = data, unread = false }: { userId?: string; notifications?: AccountNotification[]; unread?: boolean }) {
  return <NotificationsCenter userId={userId} notifications={notifications} initialReadIds={unread ? [] : notifications.map(item => item.id)} activityAvailable walletAvailable crewAvailable readAvailable />;
}
let frames: Map<number, FrameRequestCallback>;
let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  window.history.replaceState({ frameworkState: "keep" }, "", href);
  scrollTo = vi.fn(); vi.stubGlobal("scrollTo", scrollTo); vi.stubGlobal("scrollY", 950);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  actions.mark.mockResolvedValue({ ok: true });
  frames = new Map(); let id = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++id, callback); return id; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); window.history.replaceState({}, "", "/"); });
function flush() {
  act(() => {
    while (frames.size) { const [id, callback] = frames.entries().next().value!; frames.delete(id); callback(0); }
  });
}
function depart() {
  const page = render(<Page />); flush();
  fireEvent.click(screen.getByRole("button", { name: /Orders30/ })); flush();
  fireEvent.click(screen.getByRole("button", { name: /See more updates/ }));
  const list = document.getElementById("notification-tickets")!;
  list.scrollTop = 450;
  const link = screen.getAllByRole("link", { name: "View exact order" })[17];
  fireEvent.click(link);
  return { page, saved: window.history.state, link };
}

test("order Back preserves the category, expanded batches, internal scroll and page position", () => {
  const { page, saved, link } = depart();
  expect(saved.frameworkState).toBe("keep");
  expect(saved[notificationReturnKey]).toMatchObject({ userId: "owner", filter: "orders", start: 12, size: 12, listScrollTop: 450, scrollY: 950 });
  expect(link.getAttribute("href")).toBe("/account/orders?order=order-17#order-order-17");
  expect(window.location.pathname).toBe(href);
  page.unmount();
  window.history.replaceState({}, "", link.getAttribute("href"));
  window.history.replaceState(saved, "", href);
  scrollTo.mockClear(); render(<Page />); flush();
  expect(screen.getByRole("button", { name: /Orders30/ }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getAllByRole("article")).toHaveLength(24);
  expect(screen.getByRole("button", { name: "See more updates (6 remaining)" })).toBeTruthy();
  expect(document.getElementById("notification-tickets")!.scrollTop).toBe(450);
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 950, behavior: "instant" });
  // Close still collapses the expanded list after returning.
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.getAllByRole("article")).toHaveLength(12);
});

test("restores variable phone batches without rounding them to desktop page sizes", () => {
  const { page, saved } = depart(); page.unmount();
  saved[notificationReturnKey].start = 5; saved[notificationReturnKey].size = 2;
  window.history.replaceState(saved, "", href); render(<Page />); flush();
  expect(screen.getAllByRole("article")).toHaveLength(7);
  expect(screen.getByRole("button", { name: "See more updates (23 remaining)" })).toBeTruthy();
});

test("entry stacks reopen around the exact entry, and a later departure saves current choices", () => {
  const page = render(<Page />); flush();
  fireEvent.click(screen.getByRole("button", { name: /Activity2/ })); flush();
  fireEvent.click(screen.getByRole("button", { name: "See all 2 entries for TV" }));
  fireEvent.click(screen.getByRole("link", { name: "See entry 2 for TV" }));
  expect(window.history.state[notificationReturnKey].expandedGroups).toEqual(["entries:tv"]);
  page.unmount(); render(<Page />); flush();
  expect(screen.getByRole("button", { name: "Collapse entries for TV" }).getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("link", { name: "See entry 2 for TV" }).getAttribute("href")).toBe("/account/entries/entry-2");
  fireEvent.click(screen.getByRole("button", { name: /Orders30/ }));
  fireEvent.click(screen.getAllByRole("link", { name: "View exact order" })[0]);
  expect(window.history.state[notificationReturnKey]).toMatchObject({ filter: "orders", start: 0 });
});

test.each(["fresh visit", "different account", "different URL"])("does not reuse a bookmark for a %s", kind => {
  const { page } = depart(); page.unmount();
  if (kind === "fresh visit") window.history.replaceState({}, "", href);
  if (kind === "different URL") window.history.replaceState(window.history.state, "", `${href}#alert-settings`);
  render(<Page userId={kind === "different account" ? "other" : "owner"} />); flush();
  expect(screen.getByRole("button", { name: /All32/ }).getAttribute("aria-pressed")).toBe("true");
});

test("Back and Forward restore a retained component; fewer current records do not leave a blank list", () => {
  const { page, saved } = depart();
  fireEvent.click(screen.getByRole("button", { name: /All32/ }));
  window.history.replaceState(saved, "", href);
  act(() => window.dispatchEvent(new PopStateEvent("popstate"))); flush();
  expect(screen.getByRole("button", { name: /Orders30/ }).getAttribute("aria-pressed")).toBe("true");
  page.unmount(); render(<Page notifications={orders.slice(0, 2)} />); flush();
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
});

test("unread order keeps its exact destination and saves the bookmark before awaiting read status", async () => {
  render(<Page unread />); flush();
  fireEvent.click(screen.getByRole("button", { name: /Orders30/ }));
  await act(async () => { fireEvent.click(screen.getAllByRole("link", { name: "View exact order" })[0]); });
  expect(actions.mark).toHaveBeenCalledWith(["order-0"]);
  expect(actions.push).toHaveBeenCalledWith(orders[0].href);
  expect(window.history.state[notificationReturnKey].filter).toBe("orders");
});

test("modified clicks leave the existing tab's bookmark alone", () => {
  render(<Page />); flush();
  fireEvent.click(screen.getAllByRole("link", { name: "View exact order" })[0], { ctrlKey: true });
  expect(window.history.state[notificationReturnKey]).toBeUndefined();
});

test("late Back scroll corrections stop as soon as the user interacts", () => {
  const { page } = depart(); page.unmount(); vi.useFakeTimers();
  render(<Page />); flush(); scrollTo.mockClear();
  act(() => { vi.advanceTimersByTime(400); }); flush();
  expect(scrollTo).toHaveBeenCalled(); scrollTo.mockClear();
  fireEvent.wheel(window);
  act(() => { vi.advanceTimersByTime(1000); }); flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test.each([{ filter: "bad" }, { start: -1 }, { size: 0 }, { scrollY: Infinity }, { listScrollTop: -2 }, { expandedGroups: [42] }])("invalid bookmarks are ignored: %o", invalid => {
  const valid: NotificationReturn = { userId: "owner", href: window.location.href, filter: "orders", start: 0, size: 12, expandedGroups: [], scrollY: 0, listScrollTop: 0, linkId: "", linkTop: 0 };
  expect(readNotificationReturn({ [notificationReturnKey]: { ...valid, ...invalid } }, "owner", window.location.href)).toBeNull();
});


test('updated notification filter and collapsed batches survive refresh after Back', () => {
  const first = depart(); first.page.unmount();
  let page = render(<Page />); flush();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  page.unmount(); page = render(<Page />); flush();
  expect(screen.getAllByRole('article')).toHaveLength(12);
  fireEvent.click(screen.getByRole('button', { name: /Activity2/ }));
  page.rerender(<Page notifications={data.map(row => ({ ...row }))} />); flush();
  expect(screen.getByRole('button', { name: /Activity2/ }).getAttribute('aria-pressed')).toBe('true');
  expect(window.history.state[notificationReturnKey]).toMatchObject({ filter: 'activity', start: 0, linkId: '' });
  page.unmount(); render(<Page />); flush();
  expect(screen.getByRole('button', { name: /Activity2/ }).getAttribute('aria-pressed')).toBe('true');
});
