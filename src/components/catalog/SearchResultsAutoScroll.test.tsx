import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SearchResultsAutoScroll } from "./SearchResultsAutoScroll";
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
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
