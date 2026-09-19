import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { buildAccountNotifications, type AccountNotification } from "@/lib/account/notifications";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import { NotificationsCenter } from "./NotificationsCenter";

vi.mock("next/image", () => ({ default: () => <span data-testid="notification-image" /> }));
const actionMocks = vi.hoisted(() => ({ respond: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: actionMocks.refresh }) }));
vi.mock("@/lib/crew/actions", () => ({ respondToCrewRequest: actionMocks.respond }));
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
  render(<NotificationsCenter notifications={notifications} activityAvailable walletAvailable crewAvailable />);
  expect(screen.getByRole("heading", { name: "Notifications" })).toBeTruthy();
  expect(screen.queryByText("Ø")).toBeNull();
  expect(screen.getByRole("link", { name: /Show barcode/ }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv");
  fireEvent.click(screen.getByRole("button", { name: /Orders0/ }));
  expect(screen.getByText("No order updates")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /All6/ }));
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  expect((screen.getByRole("button", { name: "Mark all as read" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("link", { name: /Sharing preferences/ }).getAttribute("href")).toBe("/account/crew?tab=picks#sharing");
});

test("unavailable data sources are disclosed instead of replaced with samples", () => {
  render(<NotificationsCenter notifications={[]} activityAvailable={false} walletAvailable={false} crewAvailable={false} />);
  expect(screen.getByText(/Some account updates could not be verified/)).toBeTruthy();
  expect(screen.getByText("No notifications")).toBeTruthy();
});

test("a Crew lookup failure is disclosed even when other account data is available", () => {
  render(<NotificationsCenter notifications={[]} activityAvailable walletAvailable crewAvailable={false} />);
  expect(screen.getByText(/Some account updates could not be verified/)).toBeTruthy();
});

test.each([["approve", true, "Approve"], ["decline", false, "Decline"]] as const)("a Crew request links to the requests tab and can %s", async (_label, accept, button) => {
  const invitation: AccountNotification = {
    id: "crew-request-1", category: "crew", title: "Sam wants to join your Crew",
    body: "Approve or decline this request.", meta: "Crew request", href: "/account/crew?tab=requests",
    action: "Review request", visualLabel: "Your Crew", visualValue: "Approval needed",
    tone: "crew", crewRequestId: "33333333-3333-4333-8333-333333333333",
  };
  actionMocks.respond.mockResolvedValue({ ok: true, message: "Request updated." });
  render(<NotificationsCenter notifications={[invitation]} activityAvailable walletAvailable crewAvailable />);
  expect(screen.getByRole("link", { name: /Review request/ }).getAttribute("href")).toBe("/account/crew?tab=requests");
  fireEvent.click(screen.getByRole("button", { name: button }));
  await waitFor(() => expect(actionMocks.respond).toHaveBeenCalledWith(invitation.crewRequestId, accept));
  await waitFor(() => expect(actionMocks.refresh).toHaveBeenCalledTimes(1));
});
