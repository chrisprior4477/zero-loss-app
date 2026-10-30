import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SearchResultsAutoScroll } from "./SearchResultsAutoScroll";
beforeEach(() => {
  window.history.replaceState(null, "", "/browse");
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
});

test("Browse targets retailer categories rather than products and settles after the menu closes", () => {
  window.history.replaceState(null, "", "/browse#retailer-categories-heading");
  render(<><h2 id="retailer-categories-heading" /><div id="search-results" /><SearchResultsAutoScroll searchKey="" /></>);
  const categories = vi.fn(), products = vi.fn();
  document.getElementById("retailer-categories-heading")!.scrollIntoView = categories;
  document.getElementById("search-results")!.scrollIntoView = products;
  act(() => vi.runAllTimers());
  expect(categories).toHaveBeenCalledTimes(2);
  expect(categories).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  expect(products).not.toHaveBeenCalled();
});

test("a category hash navigation works on the existing browse page and stops for user scrolling", () => {
  render(<><h2 id="retailer-categories-heading" /><SearchResultsAutoScroll searchKey="" /></>);
  const scroll = vi.fn(); document.getElementById("retailer-categories-heading")!.scrollIntoView = scroll;
  act(() => vi.runAllTimers()); expect(scroll).not.toHaveBeenCalled();
  window.history.replaceState(null, "", "/browse#retailer-categories-heading");
  fireEvent(window, new HashChangeEvent("hashchange"));
  act(() => vi.runAllTimers()); expect(scroll).toHaveBeenCalledTimes(2);
  fireEvent(window, new HashChangeEvent("hashchange"));
  fireEvent.touchStart(window); act(() => vi.runAllTimers());
  expect(scroll).toHaveBeenCalledTimes(2);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
test("search lands at items, settles header height, and runs again for a new query", () => {
  const view = render(<><div id="search-results" /><SearchResultsAutoScroll searchKey="TV" /></>);
  const scroll = vi.fn(); document.getElementById("search-results")!.scrollIntoView = scroll;
  act(() => vi.runAllTimers());
  expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  expect(scroll).toHaveBeenCalledTimes(2);
  view.rerender(<><div id="search-results" /><SearchResultsAutoScroll searchKey="coffee" /></>);
  act(() => vi.runAllTimers()); expect(scroll).toHaveBeenCalledTimes(4);
});
test("ordinary browse does not jump and user interaction cancels pending scroll", () => {
  const view = render(<><div id="search-results" /><SearchResultsAutoScroll searchKey="" /></>);
  const scroll = vi.fn(); document.getElementById("search-results")!.scrollIntoView = scroll;
  act(() => vi.runAllTimers()); expect(scroll).not.toHaveBeenCalled();
  view.rerender(<><div id="search-results" /><SearchResultsAutoScroll searchKey="TV" /></>);
  fireEvent.wheel(window); act(() => vi.runAllTimers()); expect(scroll).not.toHaveBeenCalled();
});

test("mobile browse, category and retailer routes land on offers and rerun for each selection", () => {
  const view = render(<><div id="search-results" /><SearchResultsAutoScroll searchKey="" mobileBrowseKey="/browse" /></>);
  const scroll = vi.fn(); document.getElementById("search-results")!.scrollIntoView = scroll;
  act(() => vi.runAllTimers()); expect(scroll).toHaveBeenCalledTimes(2);
  for (const route of ["/browse?partnerCategory=automotive", "/browse?partnerCategory=automotive&retailer=Jiffy+Lube", "/browse?partnerCategory=babies-and-kids&retailer=Babylist"]) {
    view.rerender(<><div id="search-results" /><SearchResultsAutoScroll searchKey="" mobileBrowseKey={route} /></>);
    act(() => vi.runAllTimers());
  }
  expect(scroll).toHaveBeenCalledTimes(8);
});

test("mobile browse still respects the explicit category directory destination", () => {
  window.history.replaceState(null, "", "/browse#retailer-categories-heading");
  render(<><h2 id="retailer-categories-heading" /><div id="search-results" /><SearchResultsAutoScroll searchKey="" mobileBrowseKey="/browse" /></>);
  const categories = vi.fn(), products = vi.fn();
  document.getElementById("retailer-categories-heading")!.scrollIntoView = categories;
  document.getElementById("search-results")!.scrollIntoView = products;
  act(() => vi.runAllTimers());
  expect(categories).toHaveBeenCalledTimes(2);
  expect(products).not.toHaveBeenCalled();
});

test("desktop category and retailer browsing retains its existing scroll position", () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  render(<><div id="search-results" /><SearchResultsAutoScroll searchKey="" mobileBrowseKey="/browse?partnerCategory=automotive&retailer=Jiffy+Lube" /></>);
  const scroll = vi.fn(); document.getElementById("search-results")!.scrollIntoView = scroll;
  act(() => vi.runAllTimers()); expect(scroll).not.toHaveBeenCalled();
});

test("touch interaction cancels the pending mobile browse scroll", () => {
  render(<><div id="search-results" /><SearchResultsAutoScroll searchKey="" mobileBrowseKey="/browse" /></>);
  const scroll = vi.fn(); document.getElementById("search-results")!.scrollIntoView = scroll;
  fireEvent.touchStart(window);
  act(() => vi.runAllTimers()); expect(scroll).not.toHaveBeenCalled();
});

test("the grocery inspiration shortcut lands on the remaining offers instead of jumping back to search", () => {
  window.history.replaceState(null, "", "/browse?category=groceries#more-groceries");
  render(<><div id="more-groceries" /><div id="search-results" /><SearchResultsAutoScroll searchKey="" mobileBrowseKey="/browse?category=groceries" /></>);
  const groceries = vi.fn(), search = vi.fn();
  document.getElementById("more-groceries")!.scrollIntoView = groceries;
  document.getElementById("search-results")!.scrollIntoView = search;
  act(() => vi.runAllTimers());
  expect(groceries).toHaveBeenCalledTimes(2);
  expect(search).not.toHaveBeenCalled();
});

test.each(["", "#search-results", "#search-results#search-results"])("Groceries lands at its inspiration panel for a %s destination", hash => {
  window.history.replaceState(null, "", `/browse?category=groceries${hash}`);
  render(<><div id="grocery-inspiration" /><div id="search-results" /><SearchResultsAutoScroll searchKey="" mobileBrowseKey="/browse?category=groceries" groceryKey="/browse?category=groceries" /></>);
  const inspiration = vi.fn(), search = vi.fn();
  document.getElementById("grocery-inspiration")!.scrollIntoView = inspiration;
  document.getElementById("search-results")!.scrollIntoView = search;
  act(() => vi.runAllTimers());
  expect(inspiration).toHaveBeenCalledTimes(2);
  expect(search).not.toHaveBeenCalled();
});

test("desktop grocery landing also starts below the header at inspiration", () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  render(<><div id="grocery-inspiration" /><SearchResultsAutoScroll searchKey="" mobileBrowseKey="/browse?category=groceries" groceryKey="/browse?category=groceries" /></>);
  const scroll = vi.fn(); document.getElementById("grocery-inspiration")!.scrollIntoView = scroll;
  act(() => vi.runAllTimers()); expect(scroll).toHaveBeenCalledTimes(2);
});
