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

test.each(menuLayouts)("$name exposes just the header ticket artwork for resizing", ({ id }) => {
  const { header } = setup(id);
  const entries = within(header).getByRole("link", { name: "11 active entries" });
  const ticket = entries.querySelector("[data-entry-ticket-icon]");
  expect(ticket?.tagName).toBe("svg");
  expect(ticket?.getAttribute("viewBox")).toBe("0 0 54 36");
  expect(ticket?.getAttribute("class")).toBe("h-6 w-9 shrink-0");
  expect(entries.getAttribute("href")).toBe("/account/entries?filter=active");
  expect(within(entries).getByText("11").hasAttribute("data-entry-ticket-icon")).toBe(false);
  const balance = within(header).getByRole("link", { name: "$38 playable balance" });
  expect(balance.querySelector("[data-entry-ticket-icon]")).toBeNull();
  expect(header.querySelectorAll("[data-entry-ticket-icon]")).toHaveLength(1);
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
    onresult: (event: unknown) => void = () => {}; onend = () => {}; start() {} stop() { this.onend(); }
    constructor() { recognition = { onresult: event => this.onresult(event), onend: () => this.onend() }; }
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

test("new push-down reveals shopping shortcuts and closes after navigation", () => {
  const { mobile, header } = setup("search-down-browse");
  const shortcuts = mobile.querySelector<HTMLElement>('[aria-label="Search shopping shortcuts"]')!;
  expect(shortcuts.hasAttribute("inert")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  expect(shortcuts.hasAttribute("inert")).toBe(false);
  expect(within(shortcuts).getByRole("link", { name: "Ending Soon" }).getAttribute("href")).toBe("/browse?sort=ending-soon#search-results");
  const browse = within(shortcuts).getByRole("link", { name: "Browse" });
  expect(browse.getAttribute("href")).toBe("/browse#retailer-categories-heading");
  fireEvent.pointerDown(browse);
  expect(header.dataset.searchOpen).toBe("true");
  fireEvent.click(browse);
  expect(header.dataset.searchOpen).toBe("false");
  expect(shortcuts.hasAttribute("inert")).toBe(true);
});
