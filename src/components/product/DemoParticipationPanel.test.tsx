import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DemoParticipationPanel } from "./DemoParticipationPanel";
const actionMocks = vi.hoisted(() => ({ acknowledge: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/entries/actions", () => ({ createPreviewEntry: vi.fn(), acknowledgeExtraEntryExplainer: actionMocks.acknowledge }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
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
test("the first additional entry requires acknowledgment before saving and increasing quantity", async () => {
  actionMocks.acknowledge.mockResolvedValue({ status: "succeeded" });
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.getByRole("dialog", { name: "How Extra Chances Work" })).toBeTruthy();
  expect(screen.getByRole("img", { name: /How extra chances work/i })).toBeTruthy();
  expect(screen.getByText("Why does each entry stand alone?")).toBeTruthy();
  expect(screen.getByTestId("entry-quantity").textContent).toBe("1");
  expect(screen.getByText(/options cannot be stacked/i)).toBeTruthy();

  const saveButton = screen.getByRole("button", { name: "I understand — save my choice" });
  expect(saveButton.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /I understand how extra entries work/i }));
  expect(saveButton.hasAttribute("disabled")).toBe(false);
  fireEvent.click(saveButton);
  await waitFor(() => expect(actionMocks.acknowledge).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByTestId("entry-quantity").textContent).toBe("2");
  expect(screen.getByRole("button", { name: "Enter for $2.00" })).toBeTruthy();
  expect(document.querySelector('input[name="quantity"]')?.getAttribute("value")).toBe("2");

  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("entry-quantity").textContent).toBe("3");
});
test("the remembered preference is saved and prevents future explainers", async () => {
  actionMocks.acknowledge.mockResolvedValue({ status: "succeeded" });
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I understand how extra entries work/i }));
  fireEvent.click(screen.getByRole("button", { name: "I understand — save my choice" }));
  await waitFor(() => expect(actionMocks.acknowledge).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("entry-quantity").textContent).toBe("3");
});
test("a stored acknowledgment adds directly without opening the explainer", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn extraEntryExplainerAcknowledged />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("entry-quantity").textContent).toBe("2");
});
test("failed product balance cannot become zero", () => {
  render(<DemoParticipationPanel {...props} />);
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("Unavailable");
  expect(screen.getByRole("link", { name: "Sign in to enter" })).toBeTruthy();
});
