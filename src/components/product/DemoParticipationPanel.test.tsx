import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoParticipationPanel } from "./DemoParticipationPanel";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/entries/actions", () => ({ createPreviewEntry: vi.fn() }));
afterEach(cleanup);
const props = { productSlug: "test-product", requestKey: "entry_request_key_01", productTitle: "Test product", retailer: "Test store", productValue: 100, entryPrice: 1, sold: 9, capacity: 10 };
test("product balance comes from server data and signed-in preview submits a quantity", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("$26");
  expect(screen.queryByText("$24.00")).toBeNull();
  expect(screen.getByRole("button", { name: "Enter for $1.00" })).toBeTruthy();
  expect(document.querySelector('input[name="offeringSlug"]')?.getAttribute("value")).toBe("test-product");
  expect(document.querySelector('input[name="idempotencyKey"]')?.getAttribute("value")).toBe("entry_request_key_01");
  expect(document.querySelector('input[name="quantity"]')?.getAttribute("value")).toBe("1");
  expect(screen.getByRole("button", { name: "Remove one entry" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText(/written atomically to the development\/test database/)).toBeTruthy();
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("$26");
});
test("the first additional entry explains independence before increasing quantity", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.getByRole("dialog", { name: "Every entry stands on its own." })).toBeTruthy();
  expect(screen.getByTestId("entry-quantity").textContent).toBe("1");
  expect(screen.getByText(/options cannot be stacked/i)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "I understand — add entry" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("entry-quantity").textContent).toBe("2");
  expect(screen.getByRole("button", { name: "Enter for $2.00" })).toBeTruthy();
  expect(document.querySelector('input[name="quantity"]')?.getAttribute("value")).toBe("2");

  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("entry-quantity").textContent).toBe("3");
});
test("failed product balance cannot become zero", () => {
  render(<DemoParticipationPanel {...props} />);
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("Unavailable");
  expect(screen.getByRole("link", { name: "Sign in to enter" })).toBeTruthy();
});
