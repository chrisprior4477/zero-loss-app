import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MenuLayoutProvider } from "./MenuLayoutProvider";
import { ResponsiveSiteHeader } from "./ResponsiveSiteHeader";
import type { MenuLayout } from "@/lib/navigation/menu-layout";
import { menuLayouts } from "@/lib/navigation/menu-layout";
import { HeaderAccountMetrics } from "./HeaderAccountMetrics";
import Link from "next/link";

const navigation = vi.hoisted(() => ({ path: "/account/profile", push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.path, useRouter: () => ({ push: navigation.push }), useSearchParams: () => new URLSearchParams() }));
let resized: () => void;
beforeEach(() => {
  navigation.path = "/account/profile"; navigation.push.mockReset();
  vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { callback(); return 1; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function setup(layout: MenuLayout) {
  const metrics = <HeaderAccountMetrics isSignedIn liveBalance="$38" activityState={{ isPreview: false, activity: [], activeCount: 11, source: "stored" }} />;
  const result = render(<MenuLayoutProvider initialLayout={layout}><ResponsiveSiteHeader logo={<Link href="/">Logo</Link>} metrics={metrics} accountMenu={<button>My account</button>} endingSoonItems={[]} hiddenSlugs={[]} /></MenuLayoutProvider>);
  const mobile = result.container.querySelector<HTMLElement>("#mobile-menu-search")!;
  return { ...result, mobile, header: result.container.querySelector("header")! };
}

test("desktop centering reserves the wider side and remeasures changing account controls", () => {
  let accountWidth = 245;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const width = this.className.includes("accountControls") ? accountWidth : this.className.includes("logo") ? 174 : 1280;
    return { width, height: this.tagName === "HEADER" ? 111 : 44, x: 0, y: 0, top: 0, bottom: 44, left: 0, right: width, toJSON: () => ({}) };
  });
  const { header } = setup("classic");
  expect(header.style.getPropertyValue("--desktop-header-side-width")).toBe("245px");
  expect(document.documentElement.style.getPropertyValue("--site-header-height")).toBe("111px");
  accountWidth = 310;
  act(() => resized());
  expect(header.style.getPropertyValue("--desktop-header-side-width")).toBe("310px");
  accountWidth = 120;
  act(() => resized());
  expect(header.style.getPropertyValue("--desktop-header-side-width")).toBe("174px");
});

test.each(menuLayouts)("$name exposes just the header ticket artwork for resizing", ({ id }) => {
  const { header } = setup(id);
  const entries = within(header).getByRole("link", { name: "11 active entries" });
  const ticket = entries.querySelector("[data-entry-ticket-icon]");
  expect(ticket?.tagName).toBe("svg");
  expect(ticket?.getAttribute("viewBox")).toBe("0 0 54 36");
  expect(ticket?.getAttribute("class")).toBe("h-6 w-9 shrink-0");
  const standardOutline = ticket?.querySelector('[data-entry-ticket-outline="standard"]');
  const narrowOutline = ticket?.querySelector('[data-entry-ticket-outline="narrow"]');
  expect(standardOutline?.getAttribute("d")).toBe("M3 3h48v9a6 6 0 0 0 0 12v9H3v-9a6 6 0 0 0 0-12V3Z");
  expect(narrowOutline?.getAttribute("d")).toBe("M5.52 3H48.48v9a6 6 0 0 0 0 12v9H5.52v-9a6 6 0 0 0 0-12V3Z");
  expect(narrowOutline?.getAttribute("class")).toBe("hidden");
  expect(narrowOutline?.getAttribute("stroke-width")).toBe(standardOutline?.getAttribute("stroke-width"));
  expect(ticket?.querySelector("circle")?.outerHTML).toBe('<circle cx="27" cy="18" r="7.5" stroke="currentColor" stroke-width="2.2"></circle>');
  expect(ticket?.querySelector('path[stroke-linecap="round"]')?.getAttribute("d")).toBe("m20.5 25 13-14");
  expect(entries.getAttribute("href")).toBe("/account/entries?filter=active#my-activity-filters");
  expect(ticket?.closest("a")).toBe(entries);
  expect(within(entries).getByText("11").closest("a")).toBe(entries);
  expect(entries.querySelectorAll("a, button")).toHaveLength(0);
  expect(entries.classList.contains("min-h-11")).toBe(true);
  expect(entries.classList.contains("min-w-11")).toBe(true);
  expect(within(entries).getByText("11").hasAttribute("data-entry-ticket-icon")).toBe(false);
  const balance = within(header).getByRole("link", { name: "$38 playable balance" });
  expect(balance.querySelector("[data-entry-ticket-icon]")).toBeNull();
  expect(header.querySelectorAll("[data-entry-ticket-icon]")).toHaveLength(1);
});

test.each(menuLayouts)("$name uses the approved coin and links the whole balance to the wallet card", ({ id }) => {
  const { header } = setup(id);
  const balance = within(header).getByRole("link", { name: "$38 playable balance" });
  expect(balance.getAttribute("href")).toBe("/account/wallet?view=history#balance");
  expect(within(balance).getByText("$38").closest("a")).toBe(balance);
  const coin = balance.querySelector("svg")!;
  expect(coin.closest("a")).toBe(balance);
  expect(coin.getAttribute("viewBox")).toBe("0 0 54 36");
  expect(coin.getAttribute("class")).toBe("h-6 w-9 sm:h-[30px] sm:w-[45px]");
  expect([...coin.querySelectorAll("circle")].map(circle => [circle.getAttribute("cx"), circle.getAttribute("cy"), circle.getAttribute("r")])).toEqual([["18", "18", "14.5"], ["18", "18", "7.5"]]);
  expect(coin.querySelector("path")?.getAttribute("d")).toBe("m11.5 25 13-14M37 10h9.88M39 18h11M37 26h9.88");
  expect(coin.querySelector("path")?.getAttribute("stroke-width")).toBe("2.6");
  expect(coin.querySelector("path")?.getAttribute("stroke-linecap")).toBe("round");
  expect(coin.querySelector("animate, animateTransform")).toBeNull();
});

test.each(["ending-search", "home-ending-search", "search-down", "search-down-browse", "search-over"] as const)("%s opens, submits the real search and collapses", layout => {
  const { mobile, header } = setup(layout);
  if (layout.startsWith("search-")) fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  const input = within(mobile).getByRole("searchbox");
  fireEvent.focus(input);
  expect(header.dataset.searchOpen).toBe("true");
  fireEvent.change(input, { target: { value: "Coffee & tea" } });
  fireEvent.click(within(mobile).getByRole("button", { name: "Go to search results" }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?q=Coffee+%26+tea#search-results");
  expect(header.dataset.searchOpen).toBe("false");
});

test("Escape closes in-place search and returns keyboard focus", () => {
  const { mobile, header } = setup("search-over");
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  fireEvent.keyDown(within(mobile).getByRole("searchbox"), { key: "Escape" });
  expect(header.dataset.searchOpen).toBe("false");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open search" }));
});

test.each(["ending-search", "home-ending-search", "search-down", "search-down-browse", "search-over"] as const)("%s dismisses empty and typed search outside, but not inside", layout => {
  const { mobile, header } = setup(layout);
  const input = within(mobile).getByRole("searchbox");
  for (const query of ["", "Coffee"]) {
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: query } });
    fireEvent.pointerDown(input);
    expect(header.dataset.searchOpen).toBe("true");
    fireEvent.pointerDown(screen.getByRole("button", { name: "My account" }));
    expect(header.dataset.searchOpen).toBe("false");
    expect((input as HTMLInputElement).value).toBe(query);
    expect(navigation.push).not.toHaveBeenCalled();
  }
});

test("outside dismissal stops voice capture", () => {
  const stop = vi.fn();
  vi.stubGlobal("SpeechRecognition", class { start() {} stop() { stop(); } });
  const { mobile, header } = setup("search-down");
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  fireEvent.click(within(mobile).getByRole("button", { name: "Start voice search" }));
  fireEvent.pointerDown(document.body);
  expect(header.dataset.searchOpen).toBe("false");
  expect(stop).toHaveBeenCalled();
});

test("voice transcription uses the same Go action and closes the push-down", () => {
  let recognition: { onresult: (event: unknown) => void; onend: () => void };
  vi.stubGlobal("SpeechRecognition", class {
    onresult: ((event: unknown) => void) | null = null; onend: (() => void) | null = null; start() {} stop() { this.onend?.(); }
    constructor() { recognition = { onresult: event => this.onresult?.(event), onend: () => this.onend?.() }; }
  });
  const { mobile, header } = setup("search-down");
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  fireEvent.click(within(mobile).getByRole("button", { name: "Start voice search" }));
  act(() => { recognition.onresult({ results: [{ 0: { transcript: "Publix" } }] }); recognition.onend(); });
  fireEvent.click(within(mobile).getByRole("button", { name: "Go to search results" }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?q=Publix#search-results");
  expect(header.dataset.searchOpen).toBe("false");
});

test("measured menu height updates the shared scroll spacing", () => {
  const { header } = setup("classic");
  vi.spyOn(header, "getBoundingClientRect").mockReturnValue({ height: 149 } as DOMRect);
  act(() => resized());
  expect(document.documentElement.style.getPropertyValue("--site-header-height")).toBe("149px");
  vi.spyOn(header, "getBoundingClientRect").mockReturnValue({ height: 57 } as DOMRect);
  act(() => resized());
  expect(document.documentElement.style.getPropertyValue("--site-header-height")).toBe("57px");
});

test("compact shopping pages have an in-page category row; Profile does not", () => {
  let view = setup("search-over");
  expect(view.container.querySelector("[data-shopping-category-row]")).toBeNull();
  view.unmount(); navigation.path = "/browse";
  view = setup("search-over");
  expect(view.container.querySelector("[data-shopping-category-row]")).not.toBeNull();
  view.unmount(); view = setup("classic");
  expect(view.container.querySelector("[data-shopping-category-row]")).toBeNull();
});

test.each(["ending-search", "home-ending-search", "search-down", "search-down-browse", "search-over"] as const)("%s scopes the page-style Ending Soon link outside the sticky header", layout => {
  navigation.path = "/";
  const { container, header, mobile } = setup(layout);
  const row = container.querySelector<HTMLElement>("[data-shopping-category-row]")!;
  const endingSoon = within(row).getByRole("link", { name: "Ending Soon" });
  expect(endingSoon.hasAttribute("data-ending-soon-link")).toBe(true);
  expect(endingSoon.getAttribute("href")).toBe("/browse?sort=ending-soon");
  expect(header.contains(row)).toBe(false);
  if (layout === "home-ending-search") {
    expect(within(row).queryByRole("link", { name: "Home" })).toBeNull();
    expect(within(row).getAllByRole("link")[0]).toBe(endingSoon);
    expect(within(mobile).getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
  } else {
    expect(within(row).getAllByRole("link")[0]).toBe(within(row).getByRole("link", { name: "Home" }));
  }
  // Desktop keeps its own Home link, including when layout 3 is selected.
  expect(within(within(header).getByRole("navigation", { name: "Marketplace categories" })).getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
  expect(within(row).getByRole("link", { name: "Groceries" }).getAttribute("href")).toBe("/browse?category=groceries");
  expect(mobile.querySelector("[data-ending-soon-link]")).toBeNull();
});

test.each(["ending-search", "home-ending-search"] as const)("%s Ending Soon targets the product list", layout => {
  const { mobile } = setup(layout);
  expect(within(mobile).getByRole("link", { name: "Ending Soon" }).getAttribute("href")).toBe("/browse?sort=ending-soon#search-results");
});

test.each(["Favorites", "Ending Soon", "Browse"])("new push-down reveals ordered shopping shortcuts and closes after %s navigation", label => {
  const { mobile, header } = setup("search-down-browse");
  const shortcuts = mobile.querySelector<HTMLElement>('[aria-label="Search shopping shortcuts"]')!;
  expect(shortcuts.hasAttribute("inert")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  expect(shortcuts.hasAttribute("inert")).toBe(false);
  expect(within(shortcuts).getAllByRole("link").map(link => link.textContent)).toEqual(["Favorites", "Ending Soon", "Browse"]);
  expect(within(shortcuts).getByRole("link", { name: "Favorites" }).getAttribute("href")).toBe("/account/favorites");
  expect(within(shortcuts).getByRole("link", { name: "Ending Soon" }).getAttribute("href")).toBe("/browse?sort=ending-soon#search-results");
  const browse = within(shortcuts).getByRole("link", { name: "Browse" });
  expect(browse.getAttribute("href")).toBe("/browse#retailer-categories-heading");
  const destination = within(shortcuts).getByRole("link", { name: label });
  fireEvent.pointerDown(destination);
  expect(header.dataset.searchOpen).toBe("true");
  fireEvent.click(destination);
  expect(header.dataset.searchOpen).toBe("false");
  expect(shortcuts.hasAttribute("inert")).toBe(true);
});
