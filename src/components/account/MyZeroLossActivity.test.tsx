import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { drawerState } from "@/lib/account/drawer-state";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { activityFilter, activityHref, activityPresentation, filterActivity } from "@/lib/account/activity";
import { MyZeroLossActivity } from "./MyZeroLossActivity";
import { DashboardActivity } from "./DashboardActivity";
import { ActivitySelection } from "./ActivitySelection";
import { RECENT_ENTRY_STORAGE_KEY } from "@/lib/entries/request";
const { replace, redirect } = vi.hoisted(() => ({ replace: vi.fn(), redirect: vi.fn((href: string) => { throw new Error(`redirect:${href}`); }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), redirect }));
vi.mock("next/image", () => ({ default: () => <span /> }));
beforeEach(() => {
  replace.mockClear();
  redirect.mockClear();
  // jsdom does not implement the browser's native modal behavior.
  // Focus containment and background inertness are also verified in the browser.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); document.body.style.overflow = ""; });

test("newly confirmed card gets a brief Your new entry label without changing other cards", async () => {
  sessionStorage.setItem(RECENT_ENTRY_STORAGE_KEY, JSON.stringify({ slug: "playstation-5-slim", entryId: null, at: Date.now() }));
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="all" />);
  await waitFor(() => expect(screen.getByText("Your new entry")).toBeTruthy());
  expect(screen.getByText("Your new entry").closest("[data-activity-slug]")?.getAttribute("data-activity-slug")).toBe("playstation-5-slim");
  expect(sessionStorage.getItem(RECENT_ENTRY_STORAGE_KEY)).toBeNull();
});

test("same-prize open entries share one ticket and return to the exact saved entry", async () => {
  const state = storedActivityFixture();
  const base = state.activity[0];
  state.activity = [
    { ...base, entryId: "ent_11111111111111111111111111111111" },
    { ...base, entryId: "ent_22222222222222222222222222222222" },
  ];
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  render(<MyZeroLossActivity state={state} filter="all" viewedEntryId="ent_22222222222222222222222222222222" />);
  await waitFor(() => expect(screen.getByText("This is the entry you were viewing")).toBeTruthy());
  const highlighted = screen.getByText("This is the entry you were viewing").closest("[data-activity-entry-id]");
  expect(highlighted?.getAttribute("data-activity-entry-id")).toBe("ent_22222222222222222222222222222222");
  expect(within(highlighted as HTMLElement).getByText("See My")).toBeTruthy();
  expect(within(highlighted as HTMLElement).getByText("Entries")).toBeTruthy();
  expect(screen.getByText("2 entries")).toBeTruthy();
  expect(screen.queryByRole("group", { name: /Choose an entry/ })).toBeNull();
  expect(highlighted?.getAttribute("href")).toBe("/account/entries/ent_22222222222222222222222222222222");
});

test("five open chances keep one compact ticket and show a current count in its action", () => {
  const state = storedActivityFixture();
  const base = state.activity[0];
  state.activity = Array.from({ length: 5 }, (_, index) => ({
    ...base,
    entryId: `ent_${String(index + 1).repeat(32)}`,
  }));
  render(<MyZeroLossActivity state={state} filter="active" />);
  const gallery = screen.getByRole("region", { name: "Your products" });
  expect(within(gallery).getAllByRole("link", { name: /PlayStation 5 Slim Model/ })).toHaveLength(1);
  expect(gallery.getAttribute("data-desktop-rows")).toBe("1");
  expect(gallery.hasAttribute("data-multiple")).toBe(false);
  expect(within(gallery).getByText("5 entries")).toBeTruthy();
  expect(within(gallery).getByText("5", { selector: "[class*='entryActionTicket']" })).toBeTruthy();
  expect(within(gallery).getByRole("link", { name: /See My 5 Entries/ }).getAttribute("href"))
    .toBe("/account/entries/ent_11111111111111111111111111111111");
  expect(within(gallery).queryByRole("button", { name: "Next entry" })).toBeNull();
});

test("the saved-entry action count updates when confirmed entries are added", () => {
  const state = storedActivityFixture();
  const base = state.activity[0];
  state.activity = [{ ...base, entryId: `ent_${"1".repeat(32)}` }];
  const { rerender } = render(<MyZeroLossActivity state={state} filter="active" />);
  expect(screen.getByRole("link", { name: /See My 1 Entry for PlayStation/ })).toBeTruthy();
  state.activity = [
    ...state.activity,
    { ...base, entryId: `ent_${"2".repeat(32)}` },
    { ...base, entryId: `ent_${"3".repeat(32)}` },
  ];
  rerender(<MyZeroLossActivity state={state} filter="active" />);
  expect(screen.getByRole("link", { name: /See My 3 Entries for PlayStation/ })).toBeTruthy();
});

test("normal empty state cannot expose a fixture by selected slug or filter", () => {
  render(<MyZeroLossActivity state={drawerState(true)} filter="all" selectedSlug="nike-court-shot-shoes" />);
  expect(screen.getByText("Your next choice starts here")).toBeTruthy();
  expect(screen.queryByText("Nike Men's Court Shot Shoes")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
});
test("a saved pending request is visible without counting it as a confirmed entry", () => {
  const pending = { requestId: "41414141-4141-4141-8141-414141414141", slug: "best-buy-100-gift-card", title: "$100 Best Buy Gift Card",
    quantity: 1, amountCents: 100, status: "pending" as const, duplicate: false, undoUntil: "2026-10-08T12:00:30Z", serverNow: "2026-10-08T12:00:00Z", href: null };
  render(<MyZeroLossActivity state={drawerState(true)} filter="all" pendingEntries={[pending]} />);
  expect(screen.getByText("Your entry is being confirmed")).toBeTruthy();
  expect(screen.getByText(/Best Buy Gift Card is saved as a pending request/)).toBeTruthy();
  expect(screen.getByRole("link", { name: /Review pending entry/ }).getAttribute("href")).toBe("/items/best-buy-100-gift-card#enter-entry");
  expect(screen.getByRole("link", { name: "See Open Entries0" })).toBeTruthy();
});
test("a pending request is also visible when other confirmed activity exists", () => {
  const pending = { requestId: "41414141-4141-4141-8141-414141414141", slug: "best-buy-100-gift-card", title: "$100 Best Buy Gift Card",
    quantity: 1, amountCents: 100, status: "pending" as const, duplicate: false, undoUntil: "2026-10-08T12:00:30Z", serverNow: "2026-10-08T12:00:00Z", href: null };
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="all" pendingEntries={[pending]} />);
  expect(screen.getByText("Entry request awaiting confirmation")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Review pending entry/ })).toBeTruthy();
  expect(screen.getByRole("link", { name: "All4" })).toBeTruthy();
});
test("same activity source yields matching still-open count and full-row links", () => {
  const state = storedActivityFixture();
  expect(filterActivity(state.activity, "active")).toHaveLength(state.activeCount!);
  render(<MyZeroLossActivity state={state} filter="active" />);
  expect(screen.getByText("PlayStation 5 Slim Model").closest("a")?.getAttribute("href")).toContain("item=playstation-5-slim");
  expect(screen.queryByText("Baby's Essentials Bundle")).toBeNull();
  expect(activityFilter("demo=true")).toBe("all");
});
test("declined offers disappear from My Activity cards and counts", () => {
  const state = storedActivityFixture();
  state.activity[2] = { ...state.activity[2], status: "completed", completionOptionStatus: "declined" };
  render(<MyZeroLossActivity state={state} filter="all" />);
  expect(screen.getByRole("link", { name: "All3" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Completed0" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Nike Men's Court Shot Shoes/ })).toBeNull();
  expect(screen.getByRole("link", { name: /Baby's Essentials Bundle/ })).toBeTruthy();
});
test("an account with only declined offers has no My Activity cards", () => {
  const state = storedActivityFixture();
  state.activity = [{ ...state.activity[2], status: "completed", completionOptionStatus: "declined" }];
  render(<MyZeroLossActivity state={state} filter="all" />);
  expect(screen.getByRole("link", { name: "All0" })).toBeTruthy();
  expect(screen.getByText("Your next choice starts here")).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Nike Men's Court Shot Shoes/ })).toBeNull();
});
test("entry reset control appears only when explicitly enabled for a demo account", () => {
  const state = storedActivityFixture();
  const { rerender } = render(<MyZeroLossActivity state={state} filter="all" />);
  expect(screen.queryByRole("button", { name: "Clear All Entries" })).toBeNull();
  rerender(<MyZeroLossActivity state={state} filter="all" canClearDemoEntries />);
  expect(screen.getByRole("button", { name: "Clear All Entries" })).toBeTruthy();
});
test("only still-open tickets show their own offer-fill progress", () => {
  const state = storedActivityFixture();
  state.activity.push({ ...state.activity[0], slug: "another-open-offer", title: "Another open offer" });
  render(<MyZeroLossActivity state={state} filter="all" metricsBySlug={{ "playstation-5-slim": { percentFilled: 36, sold: 73, capacity: 200, remaining: 127 }, "another-open-offer": { percentFilled: 75, sold: 60, capacity: 80, remaining: 20 }, "samsung-m70h-tv": { percentFilled: 99, sold: 99, capacity: 100, remaining: 1 } }} />);
  const indicators = screen.getAllByRole("progressbar");
  expect(indicators.map(indicator => indicator.getAttribute("aria-valuenow"))).toEqual(["36", "75"]);
  expect(indicators.map(indicator => indicator.textContent)).toEqual(["36%", "75%"]);
  expect(screen.getAllByText("$1 entered")).toHaveLength(2);
  expect(screen.getByText("127 tickets left")).toBeTruthy();
  expect(screen.getByText("20 tickets left")).toBeTruthy();
  expect(within(screen.getByRole("link", { name: /Samsung 50" M70H Mini LED 4K Smart TV/ })).queryByRole("progressbar")).toBeNull();
});
test("open entry details reuse the same live count and explain outcomes", () => {
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="active" selectedSlug="playstation-5-slim" metricsBySlug={{ "playstation-5-slim": { percentFilled: 36, sold: 73, capacity: 200, remaining: 127 } }} outcomeEmailPreference={false} />);
  const dialog = screen.getByRole("dialog", { name: "PlayStation 5 Slim Model" });
  expect(within(dialog).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("36");
  expect(within(dialog).getByText("127 tickets left")).toBeTruthy();
  expect(within(dialog).getByText("73 of 200 entries filled")).toBeTruthy();
  expect(within(dialog).getByText(/win or no win/)).toBeTruthy();
  expect(within(dialog).getByRole("checkbox", { name: /Email me when any of my entry outcomes posts/ })).toBeTruthy();
});
test("completion displays exact product math and stays unavailable without a stored option id", () => {
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="completion" selectedSlug="babys-essentials-bundle" />);
  expect(screen.getByText("$100")).toBeTruthy();
  expect(screen.getByText("$99")).toBeTruthy();
  expect(screen.getByText("$1")).toBeTruthy();
  expect(screen.getByText(/retailer gift card for the advertised value/)).toBeTruthy();
  expect((screen.getByRole("button", { name: /Continue with option — not enabled/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("dialog", { name: "Baby's Essentials Bundle" })).toBeTruthy();
  expect(screen.queryByText("Result Ready")).toBeNull();
});
test("prize action respects reward format and old URLs redirect straight to the wallet", () => {
  const prize = storedActivityFixture().activity[1];
  expect(activityPresentation(prize).action).toBe("View Gift Card");
  expect(activityPresentation({ ...prize, rewardKind: "physical" }).action).toBe("Claim Prize");
  expect(activityHref(prize)).toBe("/account/wallet?reward=samsung-m70h-tv");
  expect(() => ActivitySelection({ state: storedActivityFixture(), selectedSlug: prize.slug, destination: "/account" })).toThrow("redirect:/account/wallet?reward=samsung-m70h-tv");
});

test("separate options for one product open by entry ID, while ambiguous old links fail closed", () => {
  const state = storedActivityFixture();
  const first = state.activity[2];
  first.entryId = "entry-one";
  const second = { ...first, entryId: "entry-two", paidCents: 200, remainingCents: 7300 };
  state.activity.push(second);
  const { rerender } = render(<MyZeroLossActivity state={state} filter="completion" selectedSlug={first.slug} selectedEntryId="entry-two" />);
  const cards = screen.getAllByRole("link", { name: /Nike Men's Court Shot Shoes/ });
  expect(cards.map(card => card.getAttribute("href"))).toEqual([
    "/account/entries?item=nike-court-shot-shoes&entry=entry-one&filter=completion",
    "/account/entries?item=nike-court-shot-shoes&entry=entry-two&filter=completion",
  ]);
  expect(within(screen.getByRole("dialog")).getByText("$73")).toBeTruthy();
  rerender(<MyZeroLossActivity state={state} filter="completion" selectedSlug={first.slug} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("not available");
});

test("entry ID prevents a same-product prize from replacing a purchase option", () => {
  const state = storedActivityFixture();
  const option = state.activity[2];
  option.entryId = "option-entry";
  const prize = { ...state.activity[1], slug: option.slug, entryId: "winning-entry" };
  state.activity.unshift(prize);
  render(<MyZeroLossActivity state={state} filter="all" selectedSlug={option.slug} selectedEntryId="option-entry" />);
  expect(screen.getByRole("dialog", { name: option.title })).toBeTruthy();
  expect(redirect).not.toHaveBeenCalled();
});

test("Dashboard gives authorized samples full-row local detail links without duplicating a balance", () => {
  render(<DashboardActivity state={storedActivityFixture()} />);
  const rows = document.querySelectorAll("a[data-activity-slug]");
  expect(rows).toHaveLength(4);
  for (const row of rows) {
    const slug = (row as HTMLElement).dataset.activitySlug;
    expect(row.getAttribute("href")).toBe(slug === "samsung-m70h-tv" ? `/account/wallet?reward=${slug}` : `/account?item=${slug}`);
  }
  expect(screen.getByRole("link", { name: /View all My Activity/ }).getAttribute("href")).toBe("/account/entries");
  expect(screen.queryByText(/Playable balance/i)).toBeNull();
  expect(screen.queryByText(/Sample activity for visual review/)).toBeNull();
});

test("Dashboard normal and failed-read states never borrow preview data", () => {
  const { rerender } = render(<DashboardActivity state={drawerState(true)} selectedSlug="playstation-5-slim" />);
  expect(screen.getByText("Your next choice starts here")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.querySelectorAll("a[data-activity-slug]")).toHaveLength(0);
  rerender(<DashboardActivity state={drawerState(false)} selectedSlug="babys-essentials-bundle" />);
  expect(screen.getByText("Activity unavailable")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("Dashboard recent activity stays bounded with a full-list destination", () => {
  const state = storedActivityFixture();
  state.activity.push({ ...state.activity[0], slug: "fifth-item", title: "Fifth product" });
  render(<DashboardActivity state={state} />);
  expect(document.querySelectorAll("a[data-activity-slug]")).toHaveLength(4);
  expect(screen.queryByText("Fifth product")).toBeNull();
});
test("Dashboard recent activity skips declined offers", () => {
  const state = storedActivityFixture();
  state.activity[0] = { ...state.activity[0], status: "completed", completionOptionStatus: "declined" };
  render(<DashboardActivity state={state} />);
  expect(document.querySelectorAll("a[data-activity-slug]")).toHaveLength(3);
  expect(screen.queryByRole("link", { name: /PlayStation 5 Slim Model/ })).toBeNull();
});

test("detail close and Escape preserve the originating route and filter", () => {
  const { rerender } = render(<MyZeroLossActivity state={storedActivityFixture()} filter="completion" selectedSlug="babys-essentials-bundle" />);
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close activity details" }));
  fireEvent.click(screen.getByRole("button", { name: "Close activity details" }));
  expect(replace).toHaveBeenLastCalledWith("/account/entries?filter=completion", { scroll: false });
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: false, cancelable: true }));
  expect(replace).toHaveBeenLastCalledWith("/account/entries?filter=completion", { scroll: false });
  rerender(<DashboardActivity state={storedActivityFixture()} selectedSlug="playstation-5-slim" />);
  fireEvent.click(screen.getByRole("button", { name: "Close activity details" }));
  expect(replace).toHaveBeenLastCalledWith("/account", { scroll: false });
});

test("closing details restores scroll and focuses the originating product row", () => {
  const state = storedActivityFixture();
  const { rerender } = render(<DashboardActivity state={state} />);
  const opener = screen.getByText("PlayStation 5 Slim Model").closest("a")!;
  opener.focus();
  document.body.style.overflow = "auto";
  rerender(<DashboardActivity state={state} selectedSlug="playstation-5-slim" />);
  expect(document.body.style.overflow).toBe("hidden");
  const buttons = within(screen.getByRole("dialog")).getAllByRole("button");
  expect(buttons.filter(button => !(button as HTMLButtonElement).disabled)).toHaveLength(1);
  rerender(<DashboardActivity state={state} />);
  expect(document.body.style.overflow).toBe("auto");
  expect(document.activeElement).toBe(opener);
});

test("Tab and Shift+Tab wrap through the new notification link in entry details", () => {
  render(<DashboardActivity state={storedActivityFixture()} selectedSlug="playstation-5-slim" />);
  const close = screen.getByRole("button", { name: "Close activity details" });
  const notificationLink = screen.getByRole("link", { name: "Notifications" });
  close.focus();
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(notificationLink);
  fireEvent.keyDown(notificationLink, { key: "Tab" });
  expect(document.activeElement).toBe(close);
});

test("desktop gallery retains complete catalog names, purchase math and existing filter counts", () => {
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="all" />);
  const filters = within(screen.getByRole("navigation", { name: "Filter My Activity" }));
  for (const name of ["All4", "See Open Entries1", "You Won1", "Purchase Options2", "Completed0"]) {
    expect(filters.getByRole("link", { name })).toBeTruthy();
  }
  const gallery = document.querySelector("[data-activity-gallery]");
  expect(gallery?.getAttribute("aria-label")).toBe("Your products");
  expect(gallery?.getAttribute("data-multiple")).toBe("true");
  expect(gallery?.hasAttribute("data-overflowing")).toBe(false);
  expect(gallery?.querySelectorAll("a[data-activity-slug]")).toHaveLength(4);
  expect(gallery?.getAttribute("data-desktop-rows")).toBe("2");
  expect(gallery?.getAttribute("data-stacked-rows")).toBe("2");
  expect(Array.from(gallery?.children ?? []).map(card => [
    (card as HTMLElement).style.getPropertyValue("--desktop-column"),
    (card as HTMLElement).style.getPropertyValue("--desktop-row"),
    (card as HTMLElement).style.getPropertyValue("--stacked-column"),
    (card as HTMLElement).style.getPropertyValue("--stacked-row"),
  ])).toEqual([
    ["1", "1", "1", "1"], ["2", "1", "1", "2"], ["1", "2", "2", "1"], ["2", "2", "2", "2"],
  ]);
  expect(Array.from(gallery?.querySelectorAll("a[data-activity-slug]") ?? []).map(card => (card as HTMLElement).dataset.activitySlug)).toEqual([
    "samsung-m70h-tv", "playstation-5-slim", "nike-court-shot-shoes", "babys-essentials-bundle",
  ]);
  const television = screen.getByRole("link", { name: /Samsung 50" M70H Mini LED 4K Smart TV/ });
  expect(within(television).getByText("Open reward" )).toBeTruthy();
  const shoes = screen.getByRole("link", { name: /Nike Men's Court Shot Shoes/ });
  expect(within(shoes).getByText("$74 remaining · $1 applied")).toBeTruthy();
  const essentials = screen.getByRole("link", { name: /Baby's Essentials Bundle/ });
  expect(within(essentials).getByText("$99 remaining · $1 applied")).toBeTruthy();
  expect(television.getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv");
});

test("gallery reserves a next-card peek only when another desktop column exists", () => {
  const state = storedActivityFixture();
  for (let index = 5; index <= 10; index++) {
    state.activity.push({ ...state.activity[0], slug: `item-${index}`, title: `Product ${index}` });
  }
  const { rerender } = render(<MyZeroLossActivity state={state} filter="all" />);
  expect(document.querySelector("[data-activity-gallery]")?.getAttribute("data-overflowing")).toBe("true");
  expect(document.querySelector("[data-activity-gallery]")?.getAttribute("data-stacked-overflowing")).toBe("true");
  expect(document.querySelector("[data-activity-gallery]")?.getAttribute("data-desktop-rows")).toBe("3");
  rerender(<MyZeroLossActivity state={state} filter="prize" />);
  expect(document.querySelector("[data-activity-gallery]")?.hasAttribute("data-overflowing")).toBe(false);
});

test("mobile hybrid marks only the first winner as featured and keeps every product link intact", () => {
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="all" />);
  const gallery = document.querySelector<HTMLElement>("[data-activity-gallery]")!;
  const products = Array.from(gallery.querySelectorAll<HTMLAnchorElement>("a[data-activity-slug]"));
  expect(products.filter(product => product.dataset.featured === "true").map(product => product.dataset.activitySlug)).toEqual(["samsung-m70h-tv"]);
  expect(within(gallery).getByText("Everything else")).toBeTruthy();
  expect(products.map(product => product.getAttribute("href"))).toEqual([
    "/account/wallet?reward=samsung-m70h-tv",
    "/account/entries?item=playstation-5-slim",
    "/account/entries?item=nike-court-shot-shoes",
    "/account/entries?item=babys-essentials-bundle",
  ]);
});

test("white ticket space drags while the image and action remain click targets without an extra chevron", () => {
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="active" />);
  const card = screen.getByRole("link", { name: /PlayStation 5 Slim Model/ });
  function wasPreventedBeforeTarget(target: Element) {
    let prevented = false;
    target.addEventListener("click", event => { prevented = event.defaultPrevented; event.preventDefault(); }, { once: true });
    fireEvent.click(target, { detail: 1 });
    return prevented;
  }
  expect(wasPreventedBeforeTarget(within(card).getByText("PlayStation 5 Slim Model"))).toBe(true);
  expect(wasPreventedBeforeTarget(card.querySelector("[class*='productStage']")!)).toBe(false);
  expect(wasPreventedBeforeTarget(within(card).getByText("See My"))).toBe(false);
  expect(card.querySelector("[class*='cardChevron']")).toBeNull();
});

test("unavailable activity never displays a stale card or opens its detail", () => {
  render(<MyZeroLossActivity state={{ ...storedActivityFixture(), source: "unavailable", activeCount: null }} filter="all" selectedSlug="playstation-5-slim" />);
  expect(screen.getByText("Activity unavailable")).toBeTruthy();
  expect(document.querySelectorAll("a[data-activity-slug]")).toHaveLength(0);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByText("PlayStation 5 Slim Model")).toBeNull();
});

test("gallery controls follow scroll boundaries and honor reduced motion", () => {
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="all" />);
  const track = screen.getByRole("region", { name: "Your products" });
  const scrollBy = vi.fn();
  Object.defineProperties(track, {
    clientWidth: { configurable: true, value: 300 },
    scrollWidth: { configurable: true, value: 1200 },
    scrollLeft: { configurable: true, value: 0, writable: true },
    scrollBy: { configurable: true, value: scrollBy },
  });
  vi.spyOn(track, "getBoundingClientRect").mockReturnValue({ left: 0, right: 300, width: 300 } as DOMRect);
  Array.from(track.children).forEach((child, index) => vi.spyOn(child as HTMLElement, "getBoundingClientRect").mockImplementation(() => ({ left: index * 300 - track.scrollLeft, right: (index + 1) * 300 - track.scrollLeft, width: 300 }) as DOMRect));
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  fireEvent.scroll(track);
  const previous = screen.getByRole("button", { name: "Previous product" }) as HTMLButtonElement;
  const next = screen.getByRole("button", { name: "Next product" }) as HTMLButtonElement;
  expect(previous.disabled).toBe(true);
  expect(next.disabled).toBe(false);
  fireEvent.click(next);
  expect(scrollBy).toHaveBeenCalledWith({ left: 300, behavior: "instant" });
  track.scrollLeft = 900;
  fireEvent.scroll(track);
  expect(next.disabled).toBe(true);
  expect(previous.disabled).toBe(false);
  expect(screen.getByText("4 / 4")).toBeTruthy();
  vi.unstubAllGlobals();
});

test("gallery supports click-hold dragging without opening the dragged card", () => {
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="all" />);
  const track = screen.getByRole("region", { name: "Your products" });
  const card = track.querySelector("a[data-activity-slug]")!;
  const scrollTo = vi.fn();
  expect(card.getAttribute("draggable")).toBe("false");
  track.style.columnGap = "18px";
  Object.defineProperties(track, {
    scrollLeft: { configurable: true, value: 40, writable: true },
    scrollTo: { configurable: true, value: scrollTo },
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
  vi.spyOn(track.firstElementChild as HTMLElement, "getBoundingClientRect").mockReturnValue({ width: 300 } as DOMRect);
  fireEvent.pointerDown(card, { button: 0, clientX: 220, pointerId: 7, pointerType: "mouse" });
  fireEvent.pointerMove(card, { clientX: 140, pointerId: 7, pointerType: "mouse" });
  expect(track.scrollLeft).toBe(120);
  expect(track.style.scrollSnapType).toBe("none");
  expect(track.getAttribute("data-dragging")).toBe("true");
  fireEvent.pointerUp(card, { clientX: 140, pointerId: 7, pointerType: "mouse" });
  expect(track.getAttribute("data-dragging")).toBe("false");
  expect(track.style.scrollSnapType).toBe("");
  expect(scrollTo).toHaveBeenCalledWith({ left: 318, behavior: "smooth" });
  expect(card.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))).toBe(false);

  let preventedBeforeCardHandler = true;
  card.addEventListener("click", event => { preventedBeforeCardHandler = event.defaultPrevented; event.preventDefault(); }, { once: true });
  fireEvent.pointerDown(card, { button: 0, clientX: 140, pointerId: 8, pointerType: "mouse" });
  fireEvent.pointerUp(card, { clientX: 140, pointerId: 8, pointerType: "mouse" });
  fireEvent.click(card);
  expect(preventedBeforeCardHandler).toBe(false);

  const image = card.querySelector("[data-activity-click]")!;
  fireEvent.pointerDown(image, { button: 0, clientX: 220, pointerId: 9, pointerType: "mouse" });
  fireEvent.pointerMove(image, { clientX: 140, pointerId: 9, pointerType: "mouse" });
  expect(track.scrollLeft).toBe(120);
  fireEvent.pointerUp(image, { clientX: 140, pointerId: 9, pointerType: "mouse" });

  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query === "(max-width: 940px)" })));
  fireEvent.pointerDown(card, { button: 0, clientX: 220, pointerId: 10, pointerType: "mouse" });
  fireEvent.pointerMove(card, { clientX: 140, pointerId: 10, pointerType: "mouse" });
  expect(track.scrollLeft).toBe(200);
  fireEvent.pointerUp(card, { clientX: 140, pointerId: 10, pointerType: "mouse" });
  vi.unstubAllGlobals();
});
