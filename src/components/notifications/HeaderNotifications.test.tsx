import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HeaderNotifications } from "./HeaderNotifications";
import type { AccountNotification } from "@/lib/account/notifications";
import Link from "next/link";
const mock = vi.hoisted(() => ({ push: vi.fn(), prefetch: vi.fn(), setOpen: vi.fn(), markRead: vi.fn(), enabled: true, preview: false, unread: [] as AccountNotification[], notifications: [] as AccountNotification[] }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mock.push, prefetch: mock.prefetch }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./NotificationProvider", () => ({ useNotifications: () => ({ style: "capsule", preferencesPreviewActive: mock.preview, enabled: mock.enabled, open: true, setOpen: mock.setOpen, markRead: mock.markRead, unread: mock.unread, notifications: mock.notifications }) }));
const make = (id: string, tone: AccountNotification["tone"], extra: Partial<AccountNotification> = {}): AccountNotification => ({ id, tone, category:"activity", title:id, body:"", meta:"", href:`/account/entries/${id}`, action:"View", ...extra });
beforeEach(() => {
  vi.clearAllMocks(); mock.enabled = true; mock.preview = false; mock.markRead.mockResolvedValue(undefined);
  mock.unread = [make("shared-1", "crew", {title:"Chris shared a TV",href:"/items/tv?share=11111111-1111-4111-8111-111111111111"})]; mock.notifications = mock.unread;
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(cleanup);
const metrics = <><Link href="/account/entries">Tickets</Link><Link href="/account/wallet">Balance</Link></>;
function choose(name:string) { fireEvent.click(within(screen.getByRole("navigation",{name:"Update categories"})).getByRole("button",{name:new RegExp(name)})); }
test("unread important updates keep balance links inert throughout the animation", () => {
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  expect(screen.getByText("Balance").parentElement?.hasAttribute("inert")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /unread updates/ })); expect(mock.setOpen).toHaveBeenCalledWith(true); expect(mock.push).not.toHaveBeenCalled();
});
test("shared items open individually with a return path after their read status is saved", async () => {
  render(<HeaderNotifications>{metrics}</HeaderNotifications>); choose("Shared with You");
  fireEvent.click(screen.getByRole("button", { name: /Chris shared/ }));
  await waitFor(() => expect(mock.push).toHaveBeenCalledWith(expect.stringContaining("&fromUpdates=1")));
  expect(mock.markRead).toHaveBeenCalledWith(["shared-1"]);
});
test("a failed read save never blocks navigation and shows recovery feedback", async () => {
  mock.markRead.mockRejectedValue(new Error("Could not save")); render(<HeaderNotifications>{metrics}</HeaderNotifications>); choose("Shared with You");
  fireEvent.click(screen.getByRole("button", { name: /Chris shared/ })); expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Your alert could not be marked as read. It is still available in updates."); expect(mock.push).toHaveBeenCalled();
});
test("turning header notifications off restores balance links", () => {
  mock.enabled = false; render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  expect(screen.getByText("Balance").parentElement?.hasAttribute("inert")).toBe(false); expect(screen.queryByRole("button", { name: /unread updates/ })).toBeNull();
});
test("only the chosen category is shown, with exactly six color-matched buttons", () => {
  mock.unread = [make("reward-1","reward"),make("completion-1","completion"),make("support-1","account")]; mock.notifications=mock.unread;
  const {container}=render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  expect(container.querySelector('#header-update-sections > section')?.getAttribute('aria-label')).toBe("You won");
  const buttons=within(screen.getByRole("navigation",{name:"Update categories"})).getAllByRole("button");
  expect(buttons).toHaveLength(6); expect(buttons.map(b=>b.getAttribute("data-color"))).toEqual(["green","orange","blue","blue","purple","teal"]);
  expect(container.querySelectorAll('#header-update-sections > section')).toHaveLength(1);
  choose("Support");
  expect(container.querySelector('#header-update-sections > section')?.getAttribute('aria-label')).toBe("Support tickets");
  expect(mock.markRead).not.toHaveBeenCalled(); expect(mock.push).not.toHaveBeenCalled();
});
test.each([
  ["reward","View my wins","prize"], ["completion","View purchase options","completion"],
] as const)("opening %s clears all its current alerts and opens the matching activity section", async (tone,button,filter) => {
  mock.unread = [make("one",tone,{itemTitle:"One product"}),make("two",tone,{itemTitle:"Another product"}),make("support-1","account")]; mock.notifications=mock.unread;
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  fireEvent.click(screen.getByRole("button",{name:new RegExp(`One product.*${button}`)}));
  await waitFor(()=>expect(mock.push).toHaveBeenCalledWith(`/account/entries?filter=${filter}&fromUpdates=1#my-activity-filters`));
  expect(mock.markRead).toHaveBeenCalledWith(["one","two"]);
});
test("open products consolidate into ticket totals and a click clears the open-entry batch", async () => {
  const a=make("active-1","active",{itemSlug:"lowes",itemTitle:"Lowe's Card",entryId:"one"}); const b=make("active-2","active",{itemSlug:"lowes",itemTitle:"Lowe's Card",entryId:"two"});
  mock.unread=[b,make("support-1","account")]; mock.notifications=[a,...mock.unread];
  render(<HeaderNotifications>{metrics}</HeaderNotifications>); choose("See open entries");
  expect(screen.getAllByText("Lowe's Card")).toHaveLength(1); expect(screen.getByLabelText("2 tickets")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:/Lowe's Card/}));
  await waitFor(()=>expect(mock.push).toHaveBeenCalledWith(expect.stringContaining("filter=active&viewed=one")));
  expect(mock.markRead).toHaveBeenCalledWith(["active-2"]);
});
test("open entries alone never intercept the normal ticket link", () => {
  mock.unread=[make("active-1","active"),make("wallet-1","wallet")]; mock.notifications=mock.unread;
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  expect(screen.queryByRole("button",{name:/unread updates/})).toBeNull(); expect(screen.getByText("Balance").parentElement?.hasAttribute("inert")).toBe(false);
});
test("support goes to the exact conversation and uses purple", async () => {
  mock.unread=[make("support-1","account",{title:"Reply to your case",href:"/support?case=one#conversation"})]; mock.notifications=mock.unread;
  render(<HeaderNotifications>{metrics}</HeaderNotifications>); choose("Support");
  const item=screen.getByRole("button",{name:/Reply to your case/}); expect(item.getAttribute("data-color")).toBe("purple"); fireEvent.click(item);
  await waitFor(()=>expect(mock.push).toHaveBeenCalledWith("/support?case=one&fromUpdates=1#conversation"));
});

test("Saved items opens Favorites without consuming any alerts",()=>{
 render(<HeaderNotifications>{metrics}</HeaderNotifications>); choose("Saved items");
 expect(mock.push).toHaveBeenCalledWith('/account/favorites?fromUpdates=1');
 expect(mock.markRead).not.toHaveBeenCalled();
});
test("empty accounts get noninteractive samples only while customizing",()=>{
 mock.unread=[];mock.notifications=[];mock.preview=true;
 const {rerender}=render(<HeaderNotifications>{metrics}</HeaderNotifications>);
 expect(screen.getByRole('img',{name:/Sample notification banner/})).toBeTruthy();
 expect(screen.queryByRole('button',{name:/unread updates/})).toBeNull();
 expect(screen.getByText('Balance').parentElement?.hasAttribute('inert')).toBe(true);
 mock.preview=false;rerender(<HeaderNotifications>{metrics}</HeaderNotifications>);
 expect(screen.queryByRole('img',{name:/Sample notification banner/})).toBeNull();
 expect(screen.getByText('Balance').parentElement?.hasAttribute('inert')).toBe(false);
 expect(mock.markRead).not.toHaveBeenCalled();
});
