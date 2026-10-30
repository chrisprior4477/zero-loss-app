import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ProductEntryAutoScroll } from "./ProductEntryAutoScroll";

beforeEach(() => {
  vi.useFakeTimers();
  history.replaceState(null, "", "/items/publix-100-gift-card");
  document.body.innerHTML = '<header></header><div id="product-entry-card"></div><aside id="enter-entry"></aside>';
  document.getElementById("product-entry-card")!.scrollIntoView = vi.fn();
  document.getElementById("enter-entry")!.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); document.body.innerHTML = ""; });

test.each(["", "#enter-entry"])("the product and funding return %s land on the whole compact card", hash => {
  history.replaceState(null, "", `/items/publix-100-gift-card?quantity=4&funded=1${hash}`);
  render(<ProductEntryAutoScroll productKey="publix:4:funded" />);
  act(() => vi.advanceTimersByTime(300));
  expect(document.getElementById("product-entry-card")!.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  expect(document.getElementById("enter-entry")!.scrollIntoView).not.toHaveBeenCalled();
});

test("does not pull the page back after the shopper starts scrolling", () => {
  render(<ProductEntryAutoScroll productKey="publix" />);
  act(() => { window.dispatchEvent(new Event("wheel")); vi.advanceTimersByTime(300); });
  expect(document.getElementById("product-entry-card")!.scrollIntoView).not.toHaveBeenCalled();
});

test("preserves explicit links to other parts of the product page", () => {
  history.replaceState(null, "", "/items/publix-100-gift-card#something-else");
  render(<ProductEntryAutoScroll productKey="publix" />);
  act(() => vi.advanceTimersByTime(300));
  expect(document.getElementById("product-entry-card")!.scrollIntoView).not.toHaveBeenCalled();
});
