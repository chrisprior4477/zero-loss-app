import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HeaderNotifications } from "./HeaderNotifications";
import type { AccountNotification } from "@/lib/account/notifications";
import Link from "next/link";
const mock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), setOpen: vi.fn(), markRead: vi.fn(), direct: vi.fn(), save: vi.fn(), enabled: true, preview: false, unread: [] as AccountNotification[], notifications: [] as AccountNotification[] }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mock.push, replace: mock.replace, prefetch: mock.prefetch }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./NotificationProvider", () => ({ useNotifications: () => ({ style: "capsule", preferencesPreviewActive: mock.preview, enabled: mock.enabled, open: true, setOpen: mock.setOpen, markRead: mock.markRead, directSetting: mock.direct, saveDirectSetting: mock.save, unread: mock.unread, notifications: mock.notifications }) }));
const make = (id: string, tone: AccountNotification["tone"], extra: Partial<AccountNotification> = {}): AccountNotification => ({ id, tone, category:"activity", title:id, body:"", meta:"", href:`/account/entries/${id}`, action:"View", ...extra });
beforeEach(() => {
  vi.clearAllMocks(); mock.direct.mockReturnValue(false); mock.save.mockResolvedValue(undefined); mock.enabled = true; mock.preview = false; mock.markRead.mockResolvedValue(undefined);
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

  await waitFor(() => expect(mock.replace).toHaveBeenCalledWith(expect.stringContaining("&fromUpdates=1")));
  expect(mock.markRead).toHaveBeenCalledWith(["shared-1"]);
});
test("a failed read save never blocks navigation and shows recovery feedback", async () => {
  mock.markRead.mockRejectedValue(new Error("Could not save")); render(<HeaderNotifications>{metrics}</HeaderNotifications>); choose("Shared with You");
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Your alert could not be marked as read. It is still available in updates."); expect(mock.replace).toHaveBeenCalled();
});
test("turning header notifications off restores balance links", () => {
  mock.enabled = false; render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  expect(screen.getByText("Balance").parentElement?.hasAttribute("inert")).toBe(false); expect(screen.queryByRole("button", { name: /unread updates/ })).toBeNull();
});
test("the result comes before six muted shortcuts and only the opened alert is read", async () => {
  mock.unread = [make("reward-1","reward"), make("completion-1","completion"), make("support-1","account")];
  mock.notifications = mock.unread;
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  fireEvent.click(screen.getByRole("button",{name:/3 unread updates/}));
  const dialog = screen.getByRole("dialog",{name:"You won!"});
  const primary = within(dialog).getByRole("button",{name:"Claim your prize →"});
  const nav = within(dialog).getByRole("navigation",{name:"Update categories"});
  expect(primary.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(nav).getAllByRole("button").map(b => b.dataset.color)).toEqual(["green","orange","blue","purple","blue","teal"]);
  expect(mock.markRead).toHaveBeenCalledExactlyOnceWith(["reward-1"]);
  expect(mock.replace).not.toHaveBeenCalled();
  expect(screen.getByText("Balance").parentElement?.hasAttribute("inert")).toBe(false);
});
test.each([
  ["reward","wins","my prize"], ["completion","options","my purchase option"],
  ["active","entries","my open entries"], ["account","support","my support ticket"],
] as const)("the %s shortcut saves without opening the record and future taps open its exact destination", async (tone, category, label) => {
  const item = make(category === "support" ? "support-1042" : "item-212",tone);
  mock.unread = [item]; mock.notifications = [item];
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  const checkbox = screen.getByRole("checkbox",{name:`Next time, skip directly to ${label}.`});
  fireEvent.click(checkbox);
  await waitFor(()=>expect(mock.save).toHaveBeenCalledWith("direct_"+category,true));
  expect(mock.replace).not.toHaveBeenCalled();
  expect(mock.markRead).not.toHaveBeenCalled();
  mock.direct.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button",{name:/1 unread updates/}));
  expect(mock.replace).toHaveBeenCalledWith(item.href+"?fromUpdates=1&updateCategory="+category);
  expect(mock.markRead).toHaveBeenCalledExactlyOnceWith([item.id]);
});
test("two tickets for one prize can be opened separately without reading the other", async () => {
  const a=make("active-1","active",{itemTitle:"Lowe's Card",entryId:"one",meta:"First ticket"});
  const b=make("active-2","active",{itemTitle:"Lowe's Card",entryId:"two",meta:"Second ticket"});
  mock.unread=[b,make("support-1","account")]; mock.notifications=[a,...mock.unread];
  render(<HeaderNotifications>{metrics}</HeaderNotifications>); choose("See open entries");
  expect(mock.markRead).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:/Lowe's Card.*Second ticket/}));
  await waitFor(()=>expect(mock.replace).toHaveBeenCalledWith(b.href+"?fromUpdates=1&updateCategory=entries"));
  expect(mock.markRead).toHaveBeenCalledExactlyOnceWith([b.id]);
});
test("open entries alone have an inbox button alongside the normal ticket link", () => {
  mock.unread=[make("active-1","active"),make("wallet-1","wallet")]; mock.notifications=mock.unread;
  render(<HeaderNotifications>{metrics}</HeaderNotifications>);
  expect(screen.getByRole("button",{name:/1 unread updates/})).toBeTruthy(); expect(screen.getByText("Balance").parentElement?.hasAttribute("inert")).toBe(false);
});
test("support goes to the exact conversation and uses purple", async () => {
  mock.unread=[make("support-1","account",{title:"Reply to your case",href:"/support?case=one#conversation"})]; mock.notifications=mock.unread;
  render(<HeaderNotifications>{metrics}</HeaderNotifications>); choose("Support");
  expect(mock.markRead).toHaveBeenCalledWith(["support-1"]);
  await waitFor(()=>expect(mock.replace).toHaveBeenCalledWith("/support?case=one&fromUpdates=1&updateCategory=support#conversation"));
});

test("Saved items opens Favorites without consuming any alerts",()=>{
 render(<HeaderNotifications>{metrics}</HeaderNotifications>); choose("Saved items");
 expect(mock.replace).toHaveBeenCalledWith('/account/favorites?fromUpdates=1');
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
