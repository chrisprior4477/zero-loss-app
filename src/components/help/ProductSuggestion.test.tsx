import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, act } from "@testing-library/react";
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
