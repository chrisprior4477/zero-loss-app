import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AccountNotification } from "@/lib/account/notifications";
const m = vi.hoisted(() => ({ mark: vi.fn(), preference: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/account/notification-read-actions", () => ({ markNotificationsRead: m.mark }));
vi.mock("@/lib/account/notification-preference-actions", () => ({ setInAppAlertPreference: m.preference }));
vi.mock("@/lib/crew/actions", () => ({ respondToCrewRequest: vi.fn() }));
import { NotificationsCenter } from "./NotificationsCenter";

const note: AccountNotification = { id: "refresh-deposit", category: "activity", tone: "wallet", title: "Demo deposit", body: "Funds added", meta: "Wallet activity", href: "/account/wallet", action: "View deposit", preferenceKey: "wallet_updates" };
const base = { notifications: [note], activityAvailable: true, walletAvailable: true, crewAvailable: true, readAvailable: true };
const marker = () => screen.getByRole("article").getAttribute("data-read");
beforeEach(() => { vi.resetAllMocks(); m.mark.mockResolvedValue({ ok: true, message: "Saved" }); m.preference.mockResolvedValue({ ok: true, message: "Saved" }); });
afterEach(cleanup);

test("fresh server read receipts update existing markers and controls in both directions", () => {
  const view = render(<NotificationsCenter {...base} initialReadIds={[]} />);
  expect(marker()).toBe("false");
  view.rerender(<NotificationsCenter {...base} initialReadIds={[note.id]} />);
  expect(marker()).toBe("true");
  expect(screen.getByRole("button", { name: "Mark all as read" })).toHaveProperty("disabled", true);
  view.rerender(<NotificationsCenter {...base} initialReadIds={[]} />);
  expect(marker()).toBe("false");
});

test("fresh preferences update both checkboxes and the filtered list without resetting its filter", () => {
  const view = render(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: true }} />);
  fireEvent.click(screen.getByRole("button", { name: /Activity1/ }));
  view.rerender(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: false }} />);
  expect(screen.queryByText(note.title)).toBeNull();
  expect(screen.getByRole("checkbox", { name: "Wallet activity in-app alerts" })).toHaveProperty("checked", false);
  expect(screen.getByRole("button", { name: /Activity0/ }).getAttribute("aria-pressed")).toBe("true");
  view.rerender(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: true }} />);
  expect(screen.getByText(note.title)).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "Wallet activity in-app alerts" })).toHaveProperty("checked", true);
});

test("a fresh snapshot and a failed optimistic receipt never erase a confirmed server read", async () => {
  let finish!: (value: unknown) => void;
  m.mark.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<NotificationsCenter {...base} initialReadIds={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  expect(marker()).toBe("true");
  view.rerender(<NotificationsCenter {...base} initialReadIds={[]} />);
  expect(marker()).toBe("true");
  view.rerender(<NotificationsCenter {...base} initialReadIds={[note.id]} />);
  await act(async () => finish({ ok: false, message: "Response lost" }));
  expect(marker()).toBe("true");
});

test("local preference stays pending across refresh, then yields to later external changes after acknowledgment", async () => {
  let finish!: (value: unknown) => void;
  m.preference.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: true, crew_updates: true }} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Wallet activity in-app alerts" }));
  view.rerender(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: true, crew_updates: false }} />);
  expect(screen.getByRole("checkbox", { name: "Wallet activity in-app alerts" })).toHaveProperty("checked", false);
  expect(screen.getByRole("checkbox", { name: "Your Crew in-app alerts" })).toHaveProperty("checked", false);
  await act(async () => finish({ ok: true, message: "Saved" }));
  expect(screen.queryByText(note.title)).toBeNull();
  view.rerender(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: true, crew_updates: true }} />);
  expect(screen.queryByText(note.title)).toBeNull();
  view.rerender(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: false }} />);
  view.rerender(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: true }} />);
  expect(screen.getByText(note.title)).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "Wallet activity in-app alerts" })).toHaveProperty("checked", true);
});

test.each(["rejected", "lost response"])("a %s save restores the latest confirmed preference and leaves the screen usable", async kind => {
  let finish!: (value: unknown) => void;
  let fail!: (error: Error) => void;
  m.preference.mockImplementation(() => new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
  const view = render(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: false }} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Wallet activity in-app alerts" }));
  view.rerender(<NotificationsCenter {...base} initialReadIds={[]} initialAlertPreferences={{ wallet_updates: false, crew_updates: false }} />);
  await act(async () => { if (kind === "rejected") finish({ ok: false, message: "Not saved" }); else fail(new Error("Connection lost")); });
  expect(screen.getByRole("heading", { name: "Notifications" })).toBeTruthy();
  await waitFor(() => expect(screen.getByRole("checkbox", { name: "Wallet activity in-app alerts" })).toHaveProperty("disabled", false));
  expect(screen.getByRole("checkbox", { name: "Wallet activity in-app alerts" })).toHaveProperty("checked", false);
  expect(screen.getByRole("checkbox", { name: "Your Crew in-app alerts" })).toHaveProperty("checked", false);
});
