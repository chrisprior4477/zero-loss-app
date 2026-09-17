import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DemoParticipationPanel } from "./DemoParticipationPanel";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/entries/actions", () => ({ createPreviewEntry: vi.fn() }));
afterEach(cleanup);
const props = { productSlug: "test-product", requestKey: "entry_request_key_01", productTitle: "Test product", retailer: "Test store", productValue: 100, entryPrice: 1, sold: 9, capacity: 10 };
test("product balance comes from server data and signed-in preview submits one server entry", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("$26");
  expect(screen.queryByText("$24.00")).toBeNull();
  expect(screen.getByRole("button", { name: "Enter for $1.00" })).toBeTruthy();
  expect(document.querySelector('input[name="offeringSlug"]')?.getAttribute("value")).toBe("test-product");
  expect(document.querySelector('input[name="idempotencyKey"]')?.getAttribute("value")).toBe("entry_request_key_01");
  expect(screen.getByText(/written atomically to the development\/test database/)).toBeTruthy();
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("$26");
});
test("failed product balance cannot become zero", () => {
  render(<DemoParticipationPanel {...props} />);
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("Unavailable");
  expect(screen.getByRole("link", { name: "Sign in to enter" })).toBeTruthy();
});
