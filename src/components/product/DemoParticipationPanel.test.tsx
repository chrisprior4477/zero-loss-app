import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DemoParticipationPanel } from "./DemoParticipationPanel";
const actionMocks = vi.hoisted(() => ({ acknowledge: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/entries/actions", () => ({ createPreviewEntry: vi.fn(), acknowledgeExtraEntryExplainer: actionMocks.acknowledge }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const props = { productSlug: "test-product", requestKey: "entry_request_key_01", productTitle: "Test product", retailer: "Test store", productValue: 100, entryPrice: 1, sold: 9, capacity: 20 };
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

test("Add funds opens the funding form and remembers this prize", () => {
  render(<DemoParticipationPanel {...props} isSignedIn />);
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe(
    "/account/wallet?view=history&from=test-product#add-funds",
  );
});

test("signed-out funding resumes the same funding form after sign-in", () => {
  render(<DemoParticipationPanel {...props} />);
  const href = screen.getByRole("link", { name: "Add funds" }).getAttribute("href")!;
  const url = new URL(href, "https://example.test");
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("next")).toBe("/account/wallet?view=history&from=test-product#add-funds");
  expect(url.searchParams.get("focus")).toBe("email");
  expect(url.hash).toBe("#login-form");
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
  expect(screen.getByRole("link", { name: "Sign in to enter" }).getAttribute("href")).toBe(
    "/login?next=%2Fitems%2Ftest-product%23enter-entry",
  );
});

test("signed-out extra entry explanation leads to sign-in instead of an unsavable choice", () => {
  render(<DemoParticipationPanel {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.getByRole("dialog", { name: "How Extra Chances Work" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Sign in to add entries" }).getAttribute("href")).toBe(
    "/login?next=%2Fitems%2Ftest-product%23enter-entry",
  );
  expect(screen.queryByRole("button", { name: "I understand — save my choice" })).toBeNull();
});

test("cannot select more entries than the displayed remaining capacity", () => {
  render(<DemoParticipationPanel {...props} sold={9} capacity={10} isSignedIn />);
  expect(screen.getByText("1 remaining")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add one entry" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByTestId("entry-quantity").textContent).toBe("1");
});

test("a full pool cannot start a preview entry", () => {
  render(<DemoParticipationPanel {...props} sold={10} capacity={10} isSignedIn />);
  expect(screen.getByText("0 remaining")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add one entry" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "No entries remaining" }).hasAttribute("disabled")).toBe(true);
  expect(screen.queryByRole("button", { name: "Enter for $1.00" })).toBeNull();
});

test("entry submission asks for an explicit private-or-Crew sharing choice", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  expect(screen.getByRole("dialog", { name: "Share this pick with your Crew?" })).toBeTruthy();
  expect(screen.getByText(/Nothing is shared publicly/)).toBeTruthy();
  expect(document.querySelector('input[name="shareWithCrew"]')?.getAttribute("value")).toBe("no");
});
