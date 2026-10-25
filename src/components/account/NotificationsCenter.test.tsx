import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { buildAccountNotifications, type AccountNotification } from "@/lib/account/notifications";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import { NotificationsCenter } from "./NotificationsCenter";

vi.mock("next/image", () => ({ default: () => <span data-testid="notification-image" /> }));
const actionMocks = vi.hoisted(() => ({ respond: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
const readMocks = vi.hoisted(() => ({ mark: vi.fn() }));
const preferenceMocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: actionMocks.refresh, push: actionMocks.push }) }));
vi.mock("@/lib/crew/actions", () => ({ respondToCrewRequest: actionMocks.respond }));
vi.mock("@/lib/account/notification-read-actions", () => ({ markNotificationsRead: readMocks.mark }));
vi.mock("@/lib/account/notification-preference-actions", () => ({ setInAppAlertPreference: preferenceMocks.save }));
beforeEach(() => { readMocks.mark.mockResolvedValue({ ok: true, message: "Saved." }); preferenceMocks.save.mockResolvedValue({ ok: true, message: "Off — your alert choice was saved." }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const wallet: WalletSnapshot = {
  walletAccountId: "11111111-1111-4111-8111-111111111111",
  scope: "demo",
  currency: "USD",
  balanceCents: 14600,
  transactionCount: 1,
  fundingAvailable: true,
  entries: [{ id: "ledger-1", entry_type: "DEPOSIT", amount: 15000, created_at: "2026-09-17T12:00:00.000Z" }],
};

test("notifications are built from the signed-in account snapshot without inventing orders", () => {
  const notifications = buildAccountNotifications(storedActivityFixture(), wallet, true);
  expect(notifications.some(item => item.title === "Your $400 reward is ready")).toBe(true);
  expect(notifications.some(item => item.title === "Funds added to your playable wallet")).toBe(true);
  expect(notifications.some(item => item.body.includes("$146"))).toBe(true);
  expect(notifications[0].title).toBe("Your $400 reward is ready");
  expect(notifications.some(item => item.category === "orders")).toBe(false);
  expect(notifications.some(item => /shipped/i.test(item.title))).toBe(false);
});

test("notification filters, links, and read controls remain functional", () => {
  const notifications = buildAccountNotifications(storedActivityFixture(), wallet, true);
  render(<NotificationsCenter notifications={notifications} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable />);
  expect(screen.getByRole("heading", { name: "Notifications" })).toBeTruthy();
  expect(screen.queryByText("Ø")).toBeNull();
  expect(screen.getByRole("link", { name: /Claim reward/ }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv");
  fireEvent.click(screen.getByRole("button", { name: /Orders0/ }));
  expect(screen.getByText("No order updates")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /All6/ }));
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  expect((screen.getByRole("button", { name: "Mark all as read" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("link", { name: /Alert settings/ }).getAttribute("href")).toBe("#alert-settings");
  expect(screen.getByRole("link", { name: /Sharing preferences/ }).getAttribute("href")).toBe("/account/crew?tab=picks#sharing");
});

test("mobile filter changes reveal the Notifications section below the sticky site header", () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  const scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { frames.push(callback); return frames.length; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 300 });
  const siteHeader = document.createElement("header");
  siteHeader.className = "sticky";
  siteHeader.getBoundingClientRect = vi.fn(() => new DOMRect(0, 0, 360, 150));
  document.body.append(siteHeader);

  try {
    render(<NotificationsCenter notifications={[]} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable />);
    const heading = screen.getByRole("heading", { name: "Notifications" }).closest("header")!;
    heading.getBoundingClientRect = vi.fn(() => new DOMRect(0, 520, 360, 120));
    while (frames.length) frames.shift()?.(0);
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Action needed0/ }));
    expect(screen.getByText("No action needed updates")).toBeTruthy();
    frames.shift()?.(0);
    expect(scrollTo).toHaveBeenCalledWith({ top: 658, behavior: "auto" });

    fireEvent.click(screen.getByRole("button", { name: /Orders0/ }));
    expect(screen.getByText("No order updates")).toBeTruthy();
    frames.shift()?.(0);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  } finally {
    siteHeader.remove();
    if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});

test("overview tickets and every existing notification category keep their destinations", () => {
  const activity = storedActivityFixture();
  render(<NotificationsCenter notifications={buildAccountNotifications(activity, wallet, true)} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable overview={{ balanceLabel: "$146", fundingEnabled: true, activity }} />);
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe("/account/wallet?view=history#add-funds");
  expect(screen.getByRole("link", { name: /Prize Ready: 1/ }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv");
  expect(screen.getByRole("link", { name: /Purchase Options: 2/ }).getAttribute("href")).toBe("/account/entries?filter=completion");
  fireEvent.click(screen.getByRole("button", { name: /Your Crew0/ }));
  expect(screen.getByText("No your crew updates")).toBeTruthy();
});

test("the confirmed-email notification is highlighted without changing its destination", () => {
  const notifications = buildAccountNotifications(storedActivityFixture(), wallet, true);
  render(<NotificationsCenter notifications={notifications} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable />);
  const email = screen.getByText("Your email is confirmed").closest("article");
  expect(email?.getAttribute("data-emphasis")).toBe("email");
  expect(email?.querySelector("a")?.getAttribute("href")).toBe("/account/security");
  expect(screen.getByText("Funds added to your playable wallet").closest("article")?.hasAttribute("data-emphasis")).toBe(false);
});

test("unavailable data sources are disclosed instead of replaced with samples", () => {
  render(<NotificationsCenter notifications={[]} initialReadIds={[]} activityAvailable={false} walletAvailable={false} crewAvailable={false} readAvailable={false} />);
  expect(screen.getByText(/Some account updates could not be verified/)).toBeTruthy();
  expect(screen.getByText("No notifications")).toBeTruthy();
});

test("a Crew lookup failure is disclosed even when other account data is available", () => {
  render(<NotificationsCenter notifications={[]} initialReadIds={[]} activityAvailable walletAvailable crewAvailable={false} readAvailable />);
  expect(screen.getByText(/Some account updates could not be verified/)).toBeTruthy();
});

test("in-app choices persist and hide only the selected optional updates", async () => {
  const notifications = buildAccountNotifications(storedActivityFixture(), wallet, true);
  render(<NotificationsCenter notifications={notifications} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable initialAlertPreferences={{}} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Wallet activity in-app alerts" }));
  await waitFor(() => expect(preferenceMocks.save).toHaveBeenCalledWith("wallet_updates", false));
  await waitFor(() => expect(screen.getByRole("button", { name: /All5/ })).toBeTruthy());
  expect(screen.queryByText("Funds added to your playable wallet")).toBeNull();
  expect(screen.getByText("Your email is confirmed")).toBeTruthy();
});

test.each([["approve", true, "Approve"], ["decline", false, "Decline"]] as const)("a Crew request links to the requests tab and can %s", async (_label, accept, button) => {
  const invitation: AccountNotification = {
    id: "crew-request-1", category: "crew", title: "Sam wants to join your Crew",
    body: "Approve or decline this request.", meta: "Crew request", href: "/account/crew?tab=requests",
    action: "Review request", visualLabel: "Your Crew", visualValue: "Approval needed",
    tone: "crew", crewRequestId: "33333333-3333-4333-8333-333333333333",
  };
  actionMocks.respond.mockResolvedValue({ ok: true, message: "Request updated." });
  render(<NotificationsCenter notifications={[invitation]} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable />);
  expect(screen.getByRole("link", { name: /Review request/ }).getAttribute("href")).toBe("/account/crew?tab=requests");
  fireEvent.click(screen.getByRole("button", { name: button }));
  await waitFor(() => expect(actionMocks.respond).toHaveBeenCalledWith(invitation.crewRequestId, accept));
  await waitFor(() => expect(actionMocks.refresh).toHaveBeenCalledTimes(1));
});

test("read status survives a return visit when loaded from the account record", async () => {
  const notifications = buildAccountNotifications(storedActivityFixture(), wallet, true);
  const first = render(<NotificationsCenter notifications={notifications} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  await waitFor(() => expect(readMocks.mark).toHaveBeenCalledWith(notifications.map((notification) => notification.id)));
  await readMocks.mark.mock.results[0].value;
  first.unmount();
  render(<NotificationsCenter notifications={notifications} initialReadIds={notifications.map((notification) => notification.id)} activityAvailable walletAvailable crewAvailable readAvailable />);
  expect((screen.getByRole("button", { name: "Mark all as read" }) as HTMLButtonElement).disabled).toBe(true);
  expect(document.querySelectorAll('[data-read="true"]')).toHaveLength(notifications.length);
});

test("a failed save restores unread status and explains the failure", async () => {
  readMocks.mark.mockResolvedValue({ ok: false, message: "Read status could not be saved." });
  const notifications = buildAccountNotifications(storedActivityFixture(), wallet, true);
  render(<NotificationsCenter notifications={notifications} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  expect(await screen.findByText("Read status could not be saved.")).toBeTruthy();
  await waitFor(() => expect((screen.getByRole("button", { name: "Mark all as read" }) as HTMLButtonElement).disabled).toBe(false));
  await waitFor(() => expect(document.querySelectorAll('[data-read="true"]')).toHaveLength(0));
});

test("following an unread notification saves its status before opening its destination", async () => {
  const notifications = buildAccountNotifications(storedActivityFixture(), wallet, true);
  const reward = notifications.find((notification) => notification.action === "Claim reward")!;
  render(<NotificationsCenter notifications={[reward]} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable />);
  fireEvent.click(screen.getByRole("link", { name: /Claim reward/ }));
  await waitFor(() => expect(readMocks.mark).toHaveBeenCalledWith([reward.id]));
  await waitFor(() => expect(actionMocks.push).toHaveBeenCalledWith(reward.href));
});

test("a failed read receipt never blocks opening the reward", async () => {
  readMocks.mark.mockRejectedValue(new Error("offline"));
  const reward = buildAccountNotifications(storedActivityFixture(), wallet, true)[0];
  render(<NotificationsCenter notifications={[reward]} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable />);
  fireEvent.click(screen.getByRole("link", { name: /Claim reward/ }));
  await waitFor(() => expect(actionMocks.push).toHaveBeenCalledWith(reward.href));
  expect(document.querySelector('[data-read="false"]')).not.toBeNull();
});

function openEntries(count: number): AccountNotification[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `active-${index}`, entryId: `entry-${index}`, itemSlug: "bundle", itemTitle: "Gift-card bundle",
    title: "Gift-card bundle is still open", body: "Your $1 entry is still active. We’ll keep the latest status here.",
    meta: "Entry recorded", href: `/account/entries/entry-${index}`, action: "See My Entry", category: "activity", tone: "active",
    preferenceKey: "pool_progress",
  }));
}

test("a stack expands every entry without marking it read, and follows only the selected entry", async () => {
  const entries = openEntries(3);
  render(<NotificationsCenter notifications={entries} initialReadIds={[entries[0].id]} activityAvailable walletAvailable crewAvailable readAvailable />);
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("button", { name: /All3/ })).toBeTruthy();
  const expand = screen.getByRole("button", { name: "See all 3 entries for Gift-card bundle" });
  expect(expand.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(expand);
  expect(readMocks.mark).not.toHaveBeenCalled();
  const list = screen.getByRole("list", { name: "Entries for Gift-card bundle" });
  expect(list.id).toBe(expand.getAttribute("aria-controls"));
  expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  entries.forEach((entry, index) => expect(screen.getByRole("link", { name: `See entry ${index + 1} for Gift-card bundle` }).getAttribute("href")).toBe(entry.href));
  fireEvent.click(screen.getByRole("link", { name: "See entry 2 for Gift-card bundle" }));
  await waitFor(() => expect(readMocks.mark).toHaveBeenCalledWith([entries[1].id]));
  await waitFor(() => expect(actionMocks.push).toHaveBeenCalledWith(entries[1].href));
  expect(screen.getByRole("article").getAttribute("data-read")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Collapse entries for Gift-card bundle" }));
  expect(screen.queryByRole("list", { name: "Entries for Gift-card bundle" })).toBeNull();
});

test("mark all read includes collapsed entries and updates their stack marker", async () => {
  const entries = openEntries(5);
  render(<NotificationsCenter notifications={entries} initialReadIds={[entries[0].id]} activityAvailable walletAvailable crewAvailable readAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  await waitFor(() => expect(readMocks.mark).toHaveBeenCalledWith(entries.slice(1).map(item => item.id)));
  expect(screen.getByRole("article").getAttribute("data-read")).toBe("true");
});

test("show more reveals the remaining records and filters retain their full counts", async () => {
  const transactions = Array.from({ length: 15 }, (_, index): AccountNotification => ({
    id: `wallet-${index}`, category: "activity", tone: "wallet", title: `Transaction ${index}`, body: "Funds posted.",
    meta: "Wallet activity", href: `/account/wallet?transaction=${index}`, action: "View transaction",
  }));
  render(<NotificationsCenter notifications={transactions} initialReadIds={[]} activityAvailable walletAvailable crewAvailable readAvailable />);
  expect(screen.getAllByRole("article")).toHaveLength(12);
  expect(screen.getByRole("button", { name: /All15/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  await waitFor(() => expect(readMocks.mark).toHaveBeenCalledWith(transactions.map(item => item.id)));
  fireEvent.click(screen.getByRole("button", { name: /Show more updates/ }));
  expect(screen.getAllByRole("article")).toHaveLength(15);
  expect(screen.queryByRole("button", { name: /Show more updates/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Activity15/ }));
  expect(screen.getAllByRole("article")).toHaveLength(12);
});
