import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HeaderNotifications } from "./HeaderNotifications";
import Link from "next/link";
const mock = vi.hoisted(() => ({ push: vi.fn(), setOpen: vi.fn(), markRead: vi.fn(), enabled: true }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mock.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./NotificationProvider", () => ({ useNotifications: () => ({ style: "capsule", enabled: mock.enabled, open: true, setOpen: mock.setOpen, markRead: mock.markRead, unread: [{ id: "shared-1", title: "Chris shared a TV", body: "A shared pick", href: "/items/tv?share=11111111-1111-4111-8111-111111111111", action: "View item", tone: "crew" }] }) }));
beforeEach(() => { vi.clearAllMocks(); mock.enabled = true; mock.markRead.mockResolvedValue(undefined); HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); }; });
afterEach(cleanup);
const metrics = <><Link href="/account/entries">Tickets</Link><Link href="/account/wallet">Balance</Link></>;
test("unread updates keep the balance links inert during the entire animation", () => {
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  expect(screen.getByText("Balance").parentElement?.hasAttribute("inert")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /unread updates/ }));
  expect(mock.setOpen).toHaveBeenCalledWith(true);
  expect(mock.push).not.toHaveBeenCalled();
});
test("opening one update saves its read status before navigating with a return path", async () => {
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  fireEvent.click(screen.getByRole("button", { name: /Chris shared/ }));
  await waitFor(() => expect(mock.push).toHaveBeenCalledWith(expect.stringContaining("&fromUpdates=1")));
  expect(mock.markRead).toHaveBeenCalledWith(["shared-1"]);
});
test("a failed save leaves the update available instead of navigating", async () => {
  mock.markRead.mockRejectedValue(new Error("Could not save"));
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  fireEvent.click(screen.getByRole("button", { name: /Chris shared/ }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Could not save");
  expect(mock.push).not.toHaveBeenCalled();
});
test("turning header notifications off restores the balance links", () => {
  mock.enabled = false;
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  expect(screen.getByText("Balance").parentElement?.hasAttribute("inert")).toBe(false);
  expect(screen.queryByRole("button", { name: /unread updates/ })).toBeNull();
});
