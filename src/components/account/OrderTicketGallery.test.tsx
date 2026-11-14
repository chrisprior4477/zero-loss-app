import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { OrderTicketGallery, orderSupportSummary } from "./OrderTicketGallery";
import type { FulfillmentRecord } from "@/lib/account/fulfillment";
import { activityHref } from "@/lib/account/activity";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";

vi.mock("next/image", () => ({ default: () => null }));
beforeEach(() => { window.history.replaceState({}, "", "/account/orders"); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });
const record = (id: number, changes: Partial<FulfillmentRecord> = {}): FulfillmentRecord => ({
  orderNumber: `order-full-reference-${id}`, rewardSlug: "same-product", rewardId: `reward-full-reference-${id}`,
  title: `Reward ${id}`, retailer: "Retailer", image: "/test.png", faceValueCents: 10000, amountPaidCents: 9900,
  status: "fulfilled", createdAt: "2026-10-26T12:00:00Z", entryId: `entry-full-reference-${id}`, source: "purchase",
  rewardStatus: "ready", claimedAt: "2026-10-26T12:00:00Z", ...changes,
});

test("mobile pages two cards; desktop pages six, without dropping repeated products", () => {
  let phone = true;
  let change = () => {};
  vi.stubGlobal("matchMedia", () => ({ matches: phone, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }));
  render(<OrderTicketGallery orders={Array.from({ length: 8 }, (_, i) => record(i + 1))} />);
  expect(screen.getAllByRole("article")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  expect(screen.getByRole("heading", { name: "Reward 3" })).toBeTruthy();
  expect(screen.getByText("3–4 of 8")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Previous tickets" }));
  act(() => { phone = false; change(); });
  expect(screen.getAllByRole("article")).toHaveLength(6);
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  expect(screen.getByText("7–8 of 8")).toBeTruthy();
  expect(screen.getAllByRole("article")).toHaveLength(2);
});

test.each([true, false])("the track stays between groups after releasing a drag at phone width=%s", phone => {
  vi.stubGlobal("matchMedia", () => ({ matches: phone, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const pointer = { pointerId: 1, isPrimary: true, pointerType: "mouse" };
  const { container } = render(<OrderTicketGallery orders={Array.from({ length: 8 }, (_, i) => record(i + 1))} />);
  const rail = container.querySelector<HTMLElement>("[data-swipeable]")!;
  Object.defineProperty(rail, "clientWidth", { value: 320 });
  rail.querySelectorAll<HTMLElement>("[data-order-page]").forEach((point, i) => Object.defineProperty(point, "offsetLeft", { value: i * 300 }));
  const gesture = (target: HTMLElement, name: string, clientX: number, clientY: number) => {
    const event = new MouseEvent(name, { bubbles: true, cancelable: true, clientX, clientY });
    Object.assign(event, pointer);
    fireEvent(target, event);
  };
  const details = () => screen.getAllByRole("button", { name: "Order details" })[0];

  gesture(details(), "pointerdown", 140, 40);
  gesture(details(), "pointermove", 139, 100);
  gesture(details(), "pointerup", 75, 110);
  expect(screen.getByText(phone ? "1–2 of 8" : "1–6 of 8")).toBeTruthy();

  gesture(details(), "pointerdown", 140, 40);
  gesture(details(), "pointermove", 75, 43);
  expect(rail.dataset.dragging).toBe("true");
  expect(rail.scrollLeft).toBe(65);
  const incoming = rail.querySelector(`[id="reward-reward-full-reference-${phone ? 3 : 7}"]`);
  fireEvent.scroll(rail);
  gesture(rail, "pointerup", 75, 43);
  fireEvent(rail, new Event("scrollend"));
  expect(rail.dataset.dragging).toBeUndefined();
  expect(rail.scrollLeft).toBe(65);
  expect(incoming?.getAttribute("aria-hidden")).toBeNull();
  fireEvent.click(details(), { detail: 1 });
  expect(screen.queryByRole("dialog")).toBeNull();

  const incomingDetails = within(incoming as HTMLElement).getByRole("button", { name: "Order details" });
  gesture(incomingDetails, "pointerdown", 75, 43);
  gesture(incomingDetails, "pointerup", 75, 43);
  fireEvent.click(incomingDetails, { detail: 1 });
  expect(within(screen.getByRole("dialog", { name: "Order details" })).getByText(`Reward ${phone ? 3 : 7} · Retailer`)).toBeTruthy();
  expect(rail.scrollLeft).toBe(65);
});

test("native phone scrolling updates the current page and the chevrons", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const { container } = render(<OrderTicketGallery orders={Array.from({ length: 4 }, (_, i) => record(i + 1))} />);
  const rail = container.querySelector<HTMLElement>("[data-swipeable]")!;
  Object.defineProperty(rail, "clientWidth", { value: 320 });
  Object.defineProperty(rail.querySelector('[data-order-page="1"]'), "offsetLeft", { value: 300 });
  rail.scrollLeft = 150;
  fireEvent.scroll(rail);
  fireEvent(rail, new Event("scrollend"));
  expect(rail.scrollLeft).toBe(150);
  expect(screen.getByRole("button", { name: "Previous tickets" }).hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("button", { name: "Next tickets" }).hasAttribute("disabled")).toBe(false);
  rail.scrollLeft = 300;
  fireEvent.scroll(rail);
  fireEvent(rail, new Event("scrollend"));
  expect(screen.getByText("3–4 of 4")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next tickets" }).hasAttribute("disabled")).toBe(true);
});

test("details copy full references and exact checkout amounts, then return focus on close", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const order = record(1);
  render(<OrderTicketGallery orders={[order]} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  const trigger = screen.getByRole("button", { name: "Order details" });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Order details" });
  expect(within(dialog).getByText("$99")).toBeTruthy();
  expect(within(dialog).getByText("$100")).toBeTruthy();
  expect(within(dialog).getByRole("link", { name: "Report a problem to Support" }).getAttribute("href"))
    .toBe(`/account/orders?order=${order.orderNumber}&support=report&details=1`);
  expect(screen.getByRole("button", { name: "Close details" })).toBe(document.activeElement);
  fireEvent.click(within(dialog).getByRole("button", { name: "Copy order number" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(order.orderNumber));
  fireEvent.click(within(dialog).getByRole("button", { name: "Copy for Support" }));
  await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(orderSupportSummary(order)));
  const summary = writeText.mock.calls.at(-1)![0];
  for (const value of [order.rewardId, order.entryId, order.createdAt, "Gift-card value: $100", "Paid at checkout: $99"]) expect(summary).toContain(value);
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test("ticket edges navigate to the adjacent phone page and never suggest a nonexistent next page", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  render(<OrderTicketGallery orders={Array.from({ length: 4 }, (_, i) => record(i + 1))} />);
  expect(screen.queryByRole("button", { name: "Show previous order tickets" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show next order tickets" }));
  expect(screen.getByText("3–4 of 4")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Show next order tickets" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show previous order tickets" }));
  expect(screen.getByText("1–2 of 4")).toBeTruthy();
  fireEvent.click(screen.getAllByRole("button", { name: "Order details" })[0]);
  expect((screen.getByRole("button", { name: "Show next order tickets" }) as HTMLButtonElement).disabled).toBe(true);
});

test("Tab and Shift+Tab wrap within the open details", () => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([new DOMRect(0, 0, 1, 1)] as unknown as DOMRectList);
  render(<OrderTicketGallery orders={[record(1)]} />);
  fireEvent.click(screen.getByRole("button", { name: "Order details" }));
  const dialog = within(screen.getByRole("dialog"));
  const close = dialog.getByRole("button", { name: "Close details" });
  const last = dialog.getByRole("button", { name: "Copy for Support" });
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
  fireEvent.keyDown(last, { key: "Tab" });
  expect(document.activeElement).toBe(close);
});

test("a complete single page has no extra-ticket edges", () => {
  render(<OrderTicketGallery orders={[record(1)]} />);
  expect(screen.getByText("1 of 1")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Show (next|previous) order tickets/ })).toBeNull();
});

test("the last page of three phone records shows one ticket without a repeated number", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  render(<OrderTicketGallery orders={[record(1), record(2), record(3)]} />);
  expect(screen.getByText("1–2 of 3")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  expect(screen.getByText("3 of 3")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Reward 3" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next tickets" }).hasAttribute("disabled")).toBe(true);
});

test('a winning reward opens a direct support form with its own reward reference and no purchase transaction',()=>{
 const reward=record(1,{source:'winner',orderNumber:null,rewardId:'11111111-1111-4111-8111-111111111111',amountPaidCents:null});
 render(<OrderTicketGallery orders={[reward]}/>);
 fireEvent.click(screen.getByRole('button',{name:'Reward details'}));
 const dialog=screen.getByRole('dialog',{name:'Reward details'});
 expect(within(dialog).getByRole('link',{name:'Report a problem to Support'}).getAttribute('href')).toBe(`/support?rewardId=${reward.rewardId}&from=order&details=1#report-problem`);
 expect(within(dialog).getByRole('button',{name:'Copy for Support'})).toBeTruthy();
});

test.each([0, 1])("rotation keeps the selected order from a later phone page open (card %i)", async offset => {
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  let phone = true;
  let change = () => {};
  vi.stubGlobal("matchMedia", () => ({ matches: phone, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }));
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  render(<OrderTicketGallery orders={Array.from({ length: 8 }, (_, i) => record(i + 1))} />);
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  const trigger = screen.getAllByRole("button", { name: "Order details" })[offset];
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Copy for Support" }));
  await screen.findByText("Copied. Ready to paste into Support.");
  act(() => { phone = false; change(); });
  expect(screen.getByRole("dialog")).toBe(dialog);
  expect(within(dialog).getByText(`Reward ${3 + offset} · Retailer`)).toBeTruthy();
  expect(screen.getByText("1–6 of 8")).toBeTruthy();
  expect(screen.getByText("Copied. Ready to paste into Support.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next tickets" }).hasAttribute("disabled")).toBe(true);
  act(() => { phone = true; change(); });
  expect(screen.getByRole("dialog")).toBe(dialog);
  expect(screen.getByText("3–4 of 8")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close details" }));
  expect(scrollTo).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(screen.getByText("3–4 of 8")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  expect(screen.getByText("5–6 of 8")).toBeTruthy();
});

test("an order opened on the wide layout selects its own phone page even after closing", () => {
  let phone = false;
  let change = () => {};
  vi.stubGlobal("matchMedia", () => ({ matches: phone, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }));
  render(<OrderTicketGallery orders={Array.from({ length: 8 }, (_, i) => record(i + 1))} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Order details" })[5]);
  act(() => { phone = true; change(); });
  expect(within(screen.getByRole("dialog")).getByText("Reward 6 · Retailer")).toBeTruthy();
  expect(screen.getByText("5–6 of 8")).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("5–6 of 8")).toBeTruthy();
  act(() => { phone = false; change(); });
  act(() => { phone = true; change(); });
  expect(screen.getByText("5–6 of 8")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("resizing a later page without an open dialog keeps the same orders within view", () => {
  let phone = true;
  let change = () => {};
  vi.stubGlobal("matchMedia", () => ({ matches: phone, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }));
  render(<OrderTicketGallery orders={Array.from({ length: 8 }, (_, i) => record(i + 1))} />);
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  act(() => { phone = false; change(); });
  expect(screen.getByRole("heading", { name: "Reward 3" })).toBeTruthy();
  act(() => { phone = true; change(); });
  expect(screen.getByText("3–4 of 8")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("a failed copy provides selectable text instead of claiming success", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
  render(<OrderTicketGallery orders={[record(1)]} />);
  fireEvent.click(screen.getByRole("button", { name: "Order details" }));
  fireEvent.click(screen.getByRole("button", { name: "Copy for Support" }));
  const text = await screen.findByRole("textbox", { name: "Details to copy" });
  expect((text as HTMLTextAreaElement).value).toContain("order-full-reference-1");
  expect(screen.queryByText("Copied. Ready to paste into Support.")).toBeNull();
});

test("used rewards stay distinguishable and open the exact same destination as My Activity", () => {
  const activity = { ...storedActivityFixture().activity[1], rewardId: "used-reward-id", rewardStatus: "redeemed" as const };
  render(<OrderTicketGallery orders={[record(1, { rewardId: activity.rewardId, rewardSlug: activity.slug, rewardStatus: "redeemed" })]} />);
  expect(screen.getByText("Already used")).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Open gift card" })).toBeNull();
  expect(screen.getByRole("link", { name: "View used card" }).getAttribute("href")).toBe(activityHref(activity));
});

test("claimed wins and purchases open their usable wallet pass, with no redundant destinations", () => {
  const purchase = record(1), win = record(2, { source: "winner", orderNumber: null, amountPaidCents: null });
  render(<OrderTicketGallery orders={[purchase, win]} />);
  expect(screen.getAllByRole("link", { name: "Open gift card" }).map(a => a.getAttribute("href"))).toEqual([
    "/account/wallet?reward=same-product&rewardId=reward-full-reference-1",
    "/account/wallet?reward=same-product&rewardId=reward-full-reference-2",
  ]);
  expect(screen.getByText("You won")).toBeTruthy();
  expect(screen.getAllByText("Paid at checkout")).toHaveLength(1);
  expect(screen.queryByRole("link", { name: /Wallet history|My Activity/ })).toBeNull();
  expect(orderSupportSummary(win)).not.toContain("Paid at checkout");
});

test("exception status and unavailable checkout amounts remain visible without inventing data", () => {
  render(<OrderTicketGallery orders={[record(1, { status: "exception", rewardStatus: "issuance_failed", amountPaidCents: null })]} />);
  expect(screen.getByText("Action needed")).toBeTruthy();
  expect(screen.getByText("Unavailable")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Order details" }));
  expect(screen.getByText(/entitlement remains recorded/)).toBeTruthy();
});


test("browser return restores the later mobile order page and preserves router history fields", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState({ __NA: true, router: "untouched" }, "", "/account/orders#fulfillment-records");
  const orders = Array.from({ length: 4 }, (_, i) => record(i + 1));
  const first = render(<OrderTicketGallery orders={orders} />);
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  expect(window.history.state.router).toBe("untouched");
  first.unmount();
  render(<OrderTicketGallery orders={orders} />);
  expect(screen.getByText("3–4 of 4")).toBeTruthy();
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  cleanup();
  render(<OrderTicketGallery orders={[record(1), record(2)]} />);
  expect(screen.getByText("1–2 of 2")).toBeTruthy();
  window.history.replaceState(null, "", "/");
});

test("a fresh order-details return opens the selected record and remembers an explicit close", async () => {
  const order = record(2);
  window.history.replaceState({}, "", `/account/orders?order=${order.orderNumber}&details=1`);
  const view = () => render(<OrderTicketGallery orders={[order]} initialDetailsId={order.rewardId} />);
  const firstView = view();
  await screen.findByRole("dialog", { name: "Order details" });
  fireEvent.click(screen.getByRole("button", { name: "Close details" }));
  firstView.unmount();
  view();
  expect(window.history.state.zeroLossOrderTickets.openId).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test.each([true, false])("refresh and Support return reopen the same order; explicit close stays closed (phone: %s)", async phone => {
  vi.stubGlobal("matchMedia", () => ({ matches: phone, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => window.setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", window.clearTimeout);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState({ router: "keep" }, "", "/account/orders");
  const orders = Array.from({ length: 8 }, (_, i) => record(i + 1));
  let view = render(<OrderTicketGallery orders={orders} />);
  fireEvent.click(screen.getByRole("button", { name: "Next tickets" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Order details" })[1]);
  const number = phone ? 4 : 8;
  expect(window.history.state.zeroLossOrderTickets.openId).toBe(record(number).rewardId);
  expect(window.history.state.router).toBe("keep");
  view.unmount();
  view = render(<OrderTicketGallery orders={orders} />);
  await waitFor(() => expect(within(screen.getByRole("dialog")).getByText(`Reward ${number} · Retailer`)).toBeTruthy());
  const outgoing = window.history.state;
  view.unmount();
  window.history.replaceState({}, "", "/support?transaction=example");
  window.history.replaceState(outgoing, "", "/account/orders");
  view = render(<OrderTicketGallery orders={orders} />);
  await waitFor(() => expect(within(screen.getByRole("dialog")).getByText(`Reward ${number} · Retailer`)).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Close details" }));
  expect(window.history.state.zeroLossOrderTickets.openId).toBeNull();
  view.unmount();
  render(<OrderTicketGallery orders={orders} />);
  await new Promise(resolve => window.setTimeout(resolve, 20));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("a return hint cannot reopen a missing or unrelated order", async () => {
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => window.setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", window.clearTimeout);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const orders = [record(1)];
  window.history.replaceState({ zeroLossOrderTickets: { href: window.location.href, anchor: orders[0].rewardId, openId: record(2).rewardId, scrollY: 0 } }, "");
  render(<OrderTicketGallery orders={orders} />);
  await new Promise(resolve => window.setTimeout(resolve, 20));
  expect(screen.queryByRole("dialog")).toBeNull();
});
