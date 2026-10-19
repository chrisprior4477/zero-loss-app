import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MenuLayoutProvider } from "./MenuLayoutProvider";
import { ResponsiveSiteHeader } from "./ResponsiveSiteHeader";
import type { MenuLayout } from "@/lib/navigation/menu-layout";
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
  const result = render(<MenuLayoutProvider initialLayout={layout}><ResponsiveSiteHeader logo={<Link href="/">Logo</Link>} metrics={<span>11 · $38</span>} accountMenu={<button>My account</button>} endingSoonItems={[]} hiddenSlugs={[]} /></MenuLayoutProvider>);
  const mobile = result.container.querySelector<HTMLElement>("#mobile-menu-search")!;
  return { ...result, mobile, header: result.container.querySelector("header")! };
}

test.each(["ending-search", "home-ending-search", "search-down", "search-over"] as const)("%s opens, submits the real search and collapses", layout => {
  const { mobile, header } = setup(layout);
  if (layout.startsWith("search-")) fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  const input = within(mobile).getByRole("searchbox");
  fireEvent.focus(input);
  expect(header.dataset.searchOpen).toBe("true");
  fireEvent.change(input, { target: { value: "Coffee & tea" } });
  fireEvent.click(within(mobile).getByRole("button", { name: "Go to search results" }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?q=Coffee+%26+tea");
  expect(header.dataset.searchOpen).toBe("false");
});

test("Escape closes in-place search and returns keyboard focus", () => {
  const { mobile, header } = setup("search-over");
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  fireEvent.keyDown(within(mobile).getByRole("searchbox"), { key: "Escape" });
  expect(header.dataset.searchOpen).toBe("false");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open search" }));
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
  expect(navigation.push).toHaveBeenCalledWith("/browse?q=Publix");
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
