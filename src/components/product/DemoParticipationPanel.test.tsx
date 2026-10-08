import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ENTRY_REQUEST_EVENT, RECENT_ENTRY_STORAGE_KEY } from "@/lib/entries/request";
import { DemoParticipationPanel } from "./DemoParticipationPanel";
const actionMocks = vi.hoisted(() => ({ acknowledge: vi.fn(), reset: vi.fn(), enter: vi.fn(), resolve: vi.fn(), confirm: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: actionMocks.replace, refresh: vi.fn() }) }));
vi.mock("@/lib/entries/actions", () => ({ createPreviewEntry: actionMocks.enter, acknowledgeExtraEntryExplainer: actionMocks.acknowledge, resetExtraEntryExplainer: actionMocks.reset, resolvePendingEntryRequest: actionMocks.resolve, confirmPendingEntryRequest: actionMocks.confirm }));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.resetAllMocks(); });
const props = { productSlug: "test-product", requestKey: "entry_request_key_01", productTitle: "Test product", retailer: "Test store", productValue: 100, entryPrice: 1, sold: 9, capacity: 20 };
test("product balance comes from server data and signed-in preview submits a quantity", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  expect(screen.getByTestId("entry-quantity-ticket")).toBeTruthy();
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

test("lost response retries the identical intent instead of throwing away the page", async () => {
  actionMocks.enter.mockRejectedValueOnce(new Error("Network disconnected")).mockResolvedValueOnce({ status: "error", code: "outcome_unknown", message: "Still checking" });
  render(<DemoParticipationPanel {...props} isSignedIn extraEntryExplainerAcknowledged />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Enter for $2.00" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep private & enter" }));
  const retry = await screen.findByRole("button", { name: "Check saved submission" });
  const original = actionMocks.enter.mock.calls[0][1] as FormData;
  expect(original.get("quantity")).toBe("2");
  expect(screen.getByRole("button", { name: "Add one entry" }).closest("fieldset")?.disabled).toBe(true);
  fireEvent.click(retry);
  await waitFor(() => expect(actionMocks.enter).toHaveBeenCalledTimes(2));
  expect(actionMocks.enter.mock.calls[1][1]).toBe(original);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("recovered receipt links to original entry and explicitly distinguishes a new purchase", () => {
  render(<DemoParticipationPanel {...props} isSignedIn />);
  const receipt = { requestId: "41414141-4141-4141-8141-414141414141", slug: props.productSlug, title: props.productTitle, quantity: 2, amountCents: 200, status: "accepted", undoUntil: "2026-09-20T12:00:30Z", serverNow: "2026-09-21T12:00:00Z", href: "/account/entries?entry=ent_abcd" };
  act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: receipt })));
  expect(screen.getByRole("link", { name: "View previous submission →" }).getAttribute("href")).toBe(receipt.href);
  expect(document.querySelector('input[name="previousRequestId"]')?.getAttribute("value")).toBe(receipt.requestId);
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  expect(screen.getByText(/This is a new, additional submission for \$1.00/)).toBeTruthy();
  const key = document.querySelector('input[name="idempotencyKey"]')?.getAttribute("value");
  act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...receipt, status: "pending" } })));
  expect(document.querySelector('input[name="idempotencyKey"]')?.getAttribute("value")).toBe(key);
  expect(screen.queryByText("Entry awaiting confirmation…")).toBeNull();
});

test("30-second Undo appears inline by the entry controls, not in a floating toast", async () => {
  render(<DemoParticipationPanel {...props} isSignedIn />);
  const receipt = { requestId: "41414141-4141-4141-8141-414141414141", slug: props.productSlug,
    title: props.productTitle, quantity: 1, amountCents: 100, status: "pending", undoUntil: "2026-09-20T12:00:30Z",
    serverNow: "2026-09-20T12:00:00Z", href: null };
  act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: receipt })));
  expect(screen.getByText(/Entry submitted · Undo available/).closest("aside")?.id).toBe("enter-entry");
  expect(screen.getByText(/Entry submitted · Undo available/).closest("[role=status]")?.className).toContain("bg-[#ff6a00]");
  expect(screen.getByRole("button", { name: "Undo entry" }).className).toContain("bg-[#bcecff]");
  expect(screen.getByRole("button", { name: "Confirm entry" }).className).toContain("bg-[#31e800]");
  expect(document.querySelector(".fixed[aria-label='Entry confirmations']")).toBeNull();
  actionMocks.resolve.mockResolvedValue({ request: { ...receipt, status: "cancelled" } });
  fireEvent.click(screen.getByRole("button", { name: "Undo entry" }));
  await waitFor(() => expect(actionMocks.resolve).toHaveBeenCalledWith(receipt.requestId, true));
});
test("Confirm entry accepts the saved request and opens My Activity with its exact-entry marker", async () => {
  render(<DemoParticipationPanel {...props} isSignedIn />);
  const receipt = { requestId: "41414141-4141-4141-8141-414141414141", slug: props.productSlug, title: props.productTitle,
    quantity: 1, amountCents: 100, status: "pending" as const, undoUntil: "2026-09-20T12:00:30Z", serverNow: "2026-09-20T12:00:00Z", href: null };
  act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: receipt })));
  actionMocks.confirm.mockResolvedValue({ request: { ...receipt, status: "accepted", href: "/account/entries?item=test-product&entry=ent_1234" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry" }));
  await waitFor(() => expect(actionMocks.confirm).toHaveBeenCalledWith(receipt.requestId));
  await waitFor(() => expect(actionMocks.replace).toHaveBeenCalledWith("/account/entries"));
  expect(JSON.parse(sessionStorage.getItem(RECENT_ENTRY_STORAGE_KEY) ?? "null")).toMatchObject({ slug: "test-product", entryId: "ent_1234" });
});

test("Add funds opens the funding form and remembers this prize", () => {
  render(<DemoParticipationPanel {...props} isSignedIn />);
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe(
    "/account/wallet?view=history&from=test-product#add-funds",
  );
});

test("selected quantity resumes after sign-in and add funds", () => {
  render(<DemoParticipationPanel {...props} initialQuantity={3} isSignedIn />);
  expect(screen.getByTestId("entry-quantity").textContent).toBe("3");
  expect(screen.getByRole("button", { name: "Enter for $3.00" })).toBeTruthy();
  const addFunds = screen.getByRole("link", { name: "Add funds" });
  expect(addFunds.getAttribute("href")).toBe("/account/wallet?view=history&from=test-product&quantity=3#add-funds");
  fireEvent.click(addFunds);
  expect(JSON.parse(sessionStorage.getItem("zero-loss-entry-intent-v1") ?? "null")).toMatchObject({ slug: "test-product", quantity: 3 });
});

test("saved count is lowered if fewer tickets remain on return", () => {
  render(<DemoParticipationPanel {...props} sold={18} capacity={20} initialQuantity={5} isSignedIn />);
  expect(screen.getByTestId("entry-quantity").textContent).toBe("2");
  expect(screen.getByRole("status").textContent).toContain("saved selection was adjusted");
});

test("signed-out selected quantity survives login", () => {
  render(<DemoParticipationPanel {...props} initialQuantity={4} />);
  const href = screen.getByRole("link", { name: "Sign in to enter" }).getAttribute("href")!;
  expect(new URL(href, "https://example.test").searchParams.get("next")).toBe("/items/test-product?quantity=4#enter-entry");
  fireEvent.click(screen.getByRole("link", { name: "Sign in to enter" }));
  expect(JSON.parse(sessionStorage.getItem("zero-loss-entry-intent-v1") ?? "null")).toMatchObject({ slug: "test-product", quantity: 4 });
});

test("compact signed-out entry keeps quantity, live counts, and login redirect together", () => {
  render(<DemoParticipationPanel {...props} signedOutCompact initialQuantity={2} />);
  expect(screen.getByText("11 remaining")).toBeTruthy();
  expect(screen.getByTestId("entry-quantity").textContent).toBe("2");
  expect(screen.queryByText(/Each \$1\.00 entry stands alone/)).toBeNull();
  const href = screen.getByRole("link", { name: "Sign in to enter" }).getAttribute("href")!;
  expect(new URL(href, "https://example.test").searchParams.get("next")).toBe("/items/test-product?quantity=2#enter-entry");
});

test("product urgency follows counts and identifies a full pool", () => {
  const { rerender } = render(<DemoParticipationPanel {...props} sold={7} capacity={20} />);
  expect(screen.getByText(/35% full/)).toBeTruthy();
  expect(screen.queryByText(/Ending soon/i)).toBeNull();
  rerender(<DemoParticipationPanel {...props} sold={20} capacity={20} />);
  expect(screen.getByText(/Pool full/)).toBeTruthy();
  expect(screen.getByText(/No entries left/)).toBeTruthy();
});

test("unavailable inventory offers refresh instead of accepting a purchase against sample counts", () => {
  render(<DemoParticipationPanel {...props} availabilityConfirmed={false} isSignedIn />);
  expect(screen.queryByRole("button", { name: "Enter for $1.00" })).toBeNull();
  expect(screen.getByRole("button", { name: "Refresh availability" })).toBeTruthy();
  expect(actionMocks.enter).not.toHaveBeenCalled();
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
  expect(screen.getByRole("img", { name: /How extra chances work/i }).getAttribute("src")).toContain("extra-entry-explainer-seamless-neon.jpg");
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
  expect(screen.getByText("2 tickets selected")).toBeTruthy();
  expect(screen.getByText(/Nothing is entered until you press Enter for \$2\.00/)).toBeTruthy();
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
  expect(screen.getByText("2 tickets selected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove one entry" }));
  expect(screen.queryByText("2 tickets selected")).toBeNull();
});
test("a demo customer can reset the saved extra-entry explanation without changing the entry quantity", async () => {
  actionMocks.reset.mockResolvedValue({ status: "succeeded" });
  render(<DemoParticipationPanel {...props} isPreviewExperience isDemoWallet isSignedIn extraEntryExplainerAcknowledged />);
  expect(screen.getByText("Want to add extra entries?")).toBeTruthy();
  expect(screen.getByText("Click + to add one.")).toBeTruthy();
  expect(screen.queryByText(/Terms apply/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reset Entry Toast" }));
  await waitFor(() => expect(actionMocks.reset).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId("entry-quantity").textContent).toBe("1");
  expect(screen.getByText(/Extra-entry explanation reset/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.getByRole("dialog", { name: "How Extra Chances Work" })).toBeTruthy();
});
test("the extra-entry reset is not offered outside a signed-in preview demo wallet", () => {
  const { rerender } = render(<DemoParticipationPanel {...props} isDemoWallet isSignedIn extraEntryExplainerAcknowledged />);
  expect(screen.queryByRole("button", { name: "Reset Entry Toast" })).toBeNull();
  rerender(<DemoParticipationPanel {...props} isPreviewExperience isSignedIn extraEntryExplainerAcknowledged />);
  expect(screen.queryByRole("button", { name: "Reset Entry Toast" })).toBeNull();
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

test("insufficient balance opens an actionable toast before sharing or submitting an entry", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$0.25" balanceCents={25} isDemoWallet isSignedIn />);
  const enter = screen.getByRole("button", { name: "Enter for $1.00" });
  enter.focus();
  fireEvent.click(enter);
  expect(screen.getByRole("region", { name: "Insufficient playable balance" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("$0.75");
  expect(screen.getByRole("status").textContent).toContain("No entries were placed");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(actionMocks.enter).not.toHaveBeenCalled();
  expect(document.activeElement?.getAttribute("href")).toBe("/account/wallet?view=history&from=test-product#add-funds");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("region", { name: "Insufficient playable balance" })).toBeNull();
  expect(document.activeElement).toBe(enter);
  fireEvent.click(enter);
  fireEvent.click(screen.getByRole("button", { name: "Keep browsing" }));
  expect(screen.queryByRole("region", { name: "Insufficient playable balance" })).toBeNull();
});

test("multiple entries update the total and shortfall without losing the selected quantity", () => {
  render(<DemoParticipationPanel {...props} balanceCents={125} isSignedIn extraEntryExplainerAcknowledged />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Enter for $3.00" }));
  expect(screen.getByRole("status").textContent).toContain("3 entries cost $3.00");
  expect(screen.getByRole("status").textContent).toContain("$1.75");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss balance notice" }));
  expect(screen.getByTestId("entry-quantity").textContent).toBe("3");
  fireEvent.click(screen.getByRole("button", { name: "Remove one entry" }));
  expect(screen.getByRole("button", { name: "Enter for $2.00" })).toBeTruthy();
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test.each([100, null, undefined, NaN])("exact or unavailable balance does not falsely claim insufficient funds: %s", balanceCents => {
  render(<DemoParticipationPanel {...props} balanceCents={balanceCents} isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  expect(screen.queryByRole("region", { name: "Insufficient playable balance" })).toBeNull();
  expect(screen.getByRole("dialog", { name: "Share this pick with your Crew?" })).toBeTruthy();
});

test("a server-side balance change shows the funding toast without trusting stale balance numbers", async () => {
  actionMocks.enter.mockResolvedValue({ status: "error", code: "insufficient_balance", message: "Add funds to cover these entries, then return to this prize." });
  render(<DemoParticipationPanel {...props} balanceCents={1000} isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep private & enter" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Insufficient playable balance" })).toBeTruthy());
  expect(screen.getByRole("status").textContent).toContain("Your balance no longer covers");
  expect(screen.getByRole("status").textContent).not.toContain("$10.00");
  fireEvent.click(screen.getByRole("button", { name: "Keep browsing" }));
  expect(screen.queryByRole("region", { name: "Insufficient playable balance" })).toBeNull();
});

test("the quantity is capped at ten, total uses cents, and reducing stops at one", () => {
  render(<DemoParticipationPanel {...props} entryPrice={0.1} isSignedIn extraEntryExplainerAcknowledged />);
  for (let i = 0; i < 12; i++) fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.getByTestId("entry-quantity").textContent).toBe("10");
  expect(screen.getByRole("button", { name: "Enter for $1.00" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add one entry" }).hasAttribute("disabled")).toBe(true);
  for (let i = 0; i < 12; i++) fireEvent.click(screen.getByRole("button", { name: "Remove one entry" }));
  expect(screen.getByTestId("entry-quantity").textContent).toBe("1");
  expect(screen.getByRole("button", { name: "Enter for $0.10" })).toBeTruthy();
});
