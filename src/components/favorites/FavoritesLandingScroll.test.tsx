import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { menuLayouts } from "@/lib/navigation/menu-layout";
import { FavoritesLandingScroll } from "./FavoritesLandingScroll";

afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  document.querySelectorAll("[data-scroll-fixture]").forEach(element => element.remove());
  window.history.replaceState({}, "", "/");
});

function setup({ mobile = true, hash = "", headerHeight = 48 } = {}) {
  window.history.replaceState({}, "", "/account/favorites" + hash);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: mobile })));
  vi.stubGlobal("scrollY", 200);
  const scrollTo = vi.fn(); vi.stubGlobal("scrollTo", scrollTo);
  const frames = new Map<number, FrameRequestCallback>(); let nextId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++nextId, callback); return nextId; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  const flush = () => act(() => {
    while (frames.size) { const [id, callback] = frames.entries().next().value!; frames.delete(id); callback(0); }
  });
  const header = document.createElement("header"); header.dataset.scrollFixture = ""; header.className = "sticky";
  header.getBoundingClientRect = () => new DOMRect(0, 0, 390, headerHeight);
  const products = document.createElement("section"); products.id = "favorite-products"; products.dataset.scrollFixture = "";
  products.getBoundingClientRect = () => new DOMRect(0, 500, 390, 800);
  document.body.append(header, products);
  return { scrollTo, flush, frames, products };
}

test.each(menuLayouts)("$name lands on mobile Favorites below its measured header", ({ id }) => {
  const headerHeight = id === "classic" ? 128 : id === "search-over" ? 57 : id.startsWith("search-down") ? 48 : 91;
  const { scrollTo, flush } = setup({ headerHeight });
  render(<FavoritesLandingScroll enabled />); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 700 - headerHeight - 20, behavior: "auto" });
});

test("tablet and desktop retain the top-of-page landing", () => {
  const { scrollTo, flush } = setup({ mobile: false });
  render(<FavoritesLandingScroll enabled />); flush(); expect(scrollTo).not.toHaveBeenCalled();
});

test("empty or unavailable Favorites do not skip their explanation", () => {
  const { scrollTo, flush } = setup();
  render(<FavoritesLandingScroll enabled={false} />); flush(); expect(scrollTo).not.toHaveBeenCalled();
});

test("unchanged data does not repeatedly jump after the customer scrolls", () => {
  const { scrollTo, flush } = setup();
  const view = render(<FavoritesLandingScroll enabled />); flush();
  view.rerender(<FavoritesLandingScroll enabled />); flush(); expect(scrollTo).toHaveBeenCalledOnce();
});

test("explicit anchors are respected until returning to the product anchor", () => {
  const { scrollTo, flush } = setup({ hash: "#main-content" });
  render(<FavoritesLandingScroll enabled />); flush(); expect(scrollTo).not.toHaveBeenCalled();
  window.history.replaceState({}, "", "/account/favorites#favorite-products");
  act(() => window.dispatchEvent(new HashChangeEvent("hashchange"))); flush(); expect(scrollTo).toHaveBeenCalledOnce();
});

test("navigation away cancels queued scrolling and its listener", () => {
  const { scrollTo, flush, frames } = setup();
  const view = render(<FavoritesLandingScroll enabled />); view.unmount();
  act(() => window.dispatchEvent(new HashChangeEvent("hashchange"))); flush();
  expect(scrollTo).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
});

test("a missing products grid is safe", () => {
  const { scrollTo, flush, products } = setup(); products.remove();
  render(<FavoritesLandingScroll enabled />); flush(); expect(scrollTo).not.toHaveBeenCalled();
});
