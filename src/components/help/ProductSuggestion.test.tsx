import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, act } from "@testing-library/react";
vi.mock("@/components/catalog/CatalogRequestForm", () => ({ CatalogRequestForm: () => <p>Product request form</p> }));
import { ProductSuggestion } from "./ProductSuggestion";
afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); vi.restoreAllMocks(); });
test("the FAQ suggestion shortcut opens the form in place, including hash navigation", () => {
  const { container } = render(<ProductSuggestion />);
  expect(container.querySelector("details")?.open).toBe(false);
  act(() => { window.history.replaceState({}, "", "/contact#product-request"); window.dispatchEvent(new HashChangeEvent("hashchange")); });
  expect(container.querySelector("details")?.open).toBe(true);
});
test("a direct link opens the request without a second click", () => {
  window.history.replaceState({}, "", "/contact#product-request");
  const { container } = render(<ProductSuggestion />);
  expect(container.querySelector("details")?.open).toBe(true);
});

test("an expanded request stays open on the Contact history entry", () => {
  window.history.replaceState({}, "", "/contact");
  const first = render(<ProductSuggestion />);
  const disclosure = first.container.querySelector("details")!;
  disclosure.open = true;
  fireEvent(disclosure, new Event("toggle"));
  first.unmount();
  const returned = render(<ProductSuggestion />);
  expect(returned.container.querySelector("details")?.open).toBe(true);
});
