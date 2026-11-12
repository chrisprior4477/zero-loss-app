import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ENTRY_REQUEST_EVENT, RECENT_ENTRY_STORAGE_KEY } from "@/lib/entries/request";
import { DemoParticipationPanel } from "./DemoParticipationPanel";
import { FreeEntryLink, ProductEntrySelection } from "./ProductEntrySelection";
import { HeaderAccountMetrics } from "@/components/layout/HeaderAccountMetrics";
import { readEntryIntent, saveEntryIntent } from "@/lib/entries/return-intent";
import { readViewedProduct, rememberViewedProduct } from "@/lib/catalog/viewed-product";
const actionMocks = vi.hoisted(() => ({ acknowledge: vi.fn(), reset: vi.fn(), enter: vi.fn(), list: vi.fn(), resolve: vi.fn(), confirm: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: actionMocks.replace, refresh: vi.fn() }) }));
vi.mock("@/lib/entries/actions", () => ({ createPreviewEntry: actionMocks.enter, listPendingEntryRequests: actionMocks.list, acknowledgeExtraEntryExplainer: actionMocks.acknowledge, resetExtraEntryExplainer: actionMocks.reset, resolvePendingEntryRequest: actionMocks.resolve, confirmPendingEntryRequest: actionMocks.confirm }));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.resetAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); });
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn(); actionMocks.enter.mockResolvedValue({ status: "idle" });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.open = true; } });
});
const props = { productSlug: "test-product", requestKey: "entry_request_key_01", requestHead: { ready: true as const, requestId: null }, productTitle: "Test product", retailer: "Test store", productValue: 100, entryPrice: 1, sold: 9, capacity: 20 };

test.each([true, false])("both free-entry links follow the displayed quantity without submitting, signed in: %s", isSignedIn => {
  const from = "/browse?category=fishing";
  render(<ProductEntrySelection slug={props.productSlug} initialQuantity={1} remaining={11}>
    <FreeEntryLink className="" slug={props.productSlug} from={from}>Free-entry instructions</FreeEntryLink>
    <DemoParticipationPanel {...props} isSignedIn={isSignedIn} isDemoWallet browseReturnHref={from} />
    <FreeEntryLink className="" slug={props.productSlug} from={from}>Prefer to enter without a purchase?</FreeEntryLink>
  </ProductEntrySelection>);
  for (const [typed, expected] of [["7", "7"], ["20", "11"], ["1", null]]) {
    fireEvent.change(screen.getByRole("spinbutton", { name: "Number of entries" }), { target: { value: typed } });
    for (const link of screen.getAllByRole("link", { name: /Free-entry instructions|Prefer to enter/ })) {
      const url = new URL(link.getAttribute("href")!, "https://example.test");
      expect(url.pathname).toBe("/free-entry");
      expect(url.searchParams.get("offering")).toBe(props.productSlug);
      expect(url.searchParams.get("quantity")).toBe(expected);
      expect(url.searchParams.get("from")).toBe(from);
    }
  }
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test("browser Back restores the draft for this prize within current availability", () => {
  window.history.replaceState({ unrelated: true, freeEntryDraft: { slug: props.productSlug, quantity: 7 } }, "");
  try {
    render(<ProductEntrySelection slug={props.productSlug} initialQuantity={1} remaining={5}>
      <DemoParticipationPanel {...props} sold={15} isSignedIn />
    </ProductEntrySelection>);
    expect(screen.getByRole("spinbutton", { name: "Number of entries" })).toHaveProperty("value", "5");
    expect(window.history.state).toEqual({ unrelated: true });
    expect(actionMocks.enter).not.toHaveBeenCalled();
  } finally {
    window.history.replaceState(null, "");
  }
});

test("live availability caps the current selection, closes stale funding guidance, and never grows the selection again", () => {
  function page(remaining: number) {
    return <ProductEntrySelection slug={props.productSlug} initialQuantity={1} remaining={remaining}>
      <FreeEntryLink className="" slug={props.productSlug}>Free-entry instructions</FreeEntryLink>
      <DemoParticipationPanel {...props} sold={20 - remaining} isSignedIn isDemoWallet balanceCents={500} extraEntryExplainerAcknowledged />
    </ProductEntrySelection>;
  }
  const { rerender } = render(page(11));
  const input = screen.getByRole("spinbutton", { name: "Number of entries" });
  fireEvent.change(input, { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Enter for $7.00" }));
  expect(screen.getByText(/not enough funds/i)).toBeTruthy();
  rerender(page(2));
  expect(input).toHaveProperty("value", "2");
  expect(screen.getByRole("button", { name: "Enter for $2.00" })).toBeTruthy();
  expect(screen.queryByText(/not enough funds/i)).toBeNull();
  expect(screen.getByText("Availability changed. Your selection is now 2 entries.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toContain("quantity=2");
  expect(screen.getByRole("link", { name: "Free-entry instructions" }).getAttribute("href")).toContain("quantity=2");
  expect(readEntryIntent()?.quantity).toBe(2);
  rerender(page(10));
  expect(input).toHaveProperty("value", "2");
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test("the sticky wallet balance follows the current prize quantity and browse filters, then clears on exit", () => {
  const browse = "/browse?category=groceries";
  render(<HeaderAccountMetrics isSignedIn liveBalance="$1" activityState={{ source: "stored", isPreview: true, activeCount: 1, activity: [] }} />);
  const panel = render(<DemoParticipationPanel {...props} capacity={200} isSignedIn isDemoWallet browseReturnHref={browse} />);
  const wallet = screen.getByRole("link", { name: "$1 playable balance" });
  for (const quantity of [6, 7, 9, 10, 101, 1]) {
    fireEvent.change(screen.getByRole("spinbutton", { name: "Number of entries" }), { target: { value: String(quantity) } });
    const href = screen.getByRole("link", { name: "Add funds" }).getAttribute("href")!;
    expect(wallet.getAttribute("href")).toBe(href.replace("#add-funds", "#balance"));
    const params = new URL(href, "https://example.test").searchParams;
    expect(params.get("browse")).toBe(browse);
    expect(params.get("quantity") ?? "1").toBe(String(quantity));
  }
  fireEvent.click(wallet);
  expect(readEntryIntent()).toMatchObject({ slug: props.productSlug, quantity: 1, browseReturn: browse, resumeAfter: "funding" });
  panel.unmount();
  expect(wallet.getAttribute("href")).toBe("/account/wallet?view=history#balance");
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test("typing a quantity updates the total and funding return without submitting entries", () => {
  render(<DemoParticipationPanel {...props} compact capacity={200} isSignedIn isDemoWallet extraEntryExplainerAcknowledged balanceCents={0} />);
  const input = screen.getByRole("spinbutton", { name: "Number of entries" });
  fireEvent.change(input, { target: { value: "101" } });
  expect(screen.getByRole("button", { name: "Enter for $101.00" })).toBeTruthy();
  expect(document.querySelector('input[name="quantity"]')?.getAttribute("value")).toBe("101");
  expect(readEntryIntent()?.quantity).toBe(101);
  expect(screen.getAllByTestId("entry-quantity-ticket")).toHaveLength(1);
  expect(actionMocks.enter).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Enter for $101.00" }));
  expect(screen.getByRole("region", { name: "Insufficient playable balance" })).toBeTruthy();
  expect(screen.getAllByRole("link", { name: "Add funds" }).every(link => link.getAttribute("href")?.includes("quantity=101"))).toBe(true);
});

test("typed extra entries keep the existing explanation and confirmation before a purchase", async () => {
  actionMocks.acknowledge.mockResolvedValue({ status: "succeeded" });
  render(<DemoParticipationPanel {...props} isSignedIn isDemoWallet balanceCents={1000} />);
  fireEvent.change(screen.getByRole("spinbutton", { name: "Number of entries" }), { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "Enter for $5.00" }));
  expect(screen.getByRole("dialog", { name: "How Extra Chances Work" })).toBeTruthy();
  expect(actionMocks.enter).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: /I understand how extra entries work/i }));
  fireEvent.click(screen.getByRole("button", { name: "I understand — save my choice" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getByRole("spinbutton") as HTMLInputElement).value).toBe("5");
  expect(screen.getByRole("button", { name: "Enter for $5.00" })).toBeTruthy();
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test("the compact production layout retains the original submission and funding intent", () => {
  render(<DemoParticipationPanel {...props} compact initialQuantity={4} isSignedIn isDemoWallet isPreviewExperience balanceCents={0} balanceLabel="$0" browseReturnHref="/browse?category=groceries" />);
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("$0");
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("45");
  expect(screen.getByRole("button", { name: "Reset Entry Toast" }).closest("p")?.textContent).toContain("Entries and completion options never combine. Reset Entry Toast");
  fireEvent.click(screen.getByRole("button", { name: "Enter for $4.00" }));
  expect(actionMocks.enter).not.toHaveBeenCalled();
  expect(screen.getByRole("region", { name: "Insufficient playable balance" })).toBeTruthy();
  const fundingLinks = screen.getAllByRole("link", { name: "Add funds" });
  expect(fundingLinks.every(link => link.getAttribute("href")?.includes("quantity=4"))).toBe(true);
  expect(readEntryIntent()?.resumeAfter).toBeUndefined();
  fireEvent.click(fundingLinks[0]);
  expect(readEntryIntent()?.resumeAfter).toBe("funding");
  expect(document.querySelector('input[name="idempotencyKey"]')?.getAttribute("value")).toBe(props.requestKey);
  expect(document.querySelector('input[name="quantity"]')?.getAttribute("value")).toBe("4");
});
test("product balance comes from server data and signed-in preview submits a quantity", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  expect(screen.getByTestId("entry-quantity-ticket")).toBeTruthy();
  const availabilityBadge = screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent === "45% full11 left");
  expect(availabilityBadge.className).toContain("rounded-xl");
  expect(availabilityBadge.className).toContain("text-center");
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

test("the funding return highlights the enabled entry action until it is pressed, not an unfunded or full pool", () => {
  const { rerender } = render(<DemoParticipationPanel {...props} isSignedIn isDemoWallet balanceCents={2500} highlightAfterFunding />);
  expect(screen.getByRole("button", { name: "Enter for $1.00" }).getAttribute("data-funding-cue")).toBe("light-sweep");
  expect(screen.getByRole("button", { name: "Enter for $1.00" }).className).toContain("bg-[#31e800]");
  rerender(<DemoParticipationPanel {...props} isSignedIn isDemoWallet balanceCents={0} highlightAfterFunding />);
  expect(screen.getByRole("button", { name: "Enter for $1.00" }).getAttribute("data-funding-cue")).toBeNull();
  rerender(<DemoParticipationPanel {...props} sold={19} isSignedIn isDemoWallet balanceCents={2500} highlightAfterFunding />);
  expect(screen.getByRole("button", { name: "Add one entry" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "Enter for $1.00" }).getAttribute("data-funding-cue")).toBe("light-sweep");
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  expect(document.querySelector('button[type="submit"]')?.getAttribute("data-funding-cue")).toBeNull();
});

test("a return visit carries the last saved request into a new product entry", () => {
  const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  render(<DemoParticipationPanel {...props} requestHead={{ ready: true, requestId }} isSignedIn />);
  expect(document.querySelector('input[name="previousRequestId"]')?.getAttribute("value")).toBe(requestId);
});

test("checkout fails closed when the previous request cannot be checked", () => {
  render(<DemoParticipationPanel {...props} requestHead={{ ready: false, requestId: null }} isSignedIn />);
  expect(screen.getByRole("button", { name: "Enter for $1.00" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText(/couldn’t check your latest saved submission/)).toBeTruthy();
});

test("lost response retries the identical intent instead of throwing away the page", async () => {
  actionMocks.enter.mockRejectedValueOnce(new Error("Network disconnected")).mockResolvedValueOnce({ status: "error", code: "outcome_unknown", message: "Still checking" });
  const { rerender } = render(<DemoParticipationPanel {...props} isSignedIn extraEntryExplainerAcknowledged />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Enter for $2.00" }));
  await screen.findByRole("button", { name: "Check saved submission" });
  const original = actionMocks.enter.mock.calls[0][1] as FormData;
  expect(original.get("quantity")).toBe("2");
  expect(screen.getByRole("button", { name: "Add one entry" }).closest("fieldset")?.disabled).toBe(true);
  rerender(<DemoParticipationPanel {...props} sold={props.capacity} isSignedIn extraEntryExplainerAcknowledged />);
  expect(screen.getByTestId("entry-quantity")).toHaveProperty("value", "2");
  fireEvent.click(screen.getByRole("button", { name: "Check saved submission" }));
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
  expect(screen.getByText(/Previous 2-ticket submission saved. A new entry is separate/)).toBeTruthy();
  const key = document.querySelector('input[name="idempotencyKey"]')?.getAttribute("value");
  act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: { ...receipt, status: "pending" } })));
  expect(document.querySelector('input[name="idempotencyKey"]')?.getAttribute("value")).toBe(key);
  expect(screen.queryByText("Entry awaiting confirmation…")).toBeNull();
});

test("30-second Undo appears inline by the entry controls, not in a floating toast", async () => {
  const { rerender } = render(<DemoParticipationPanel {...props} isSignedIn />);
  const receipt = { requestId: "41414141-4141-4141-8141-414141414141", slug: props.productSlug,
    title: props.productTitle, quantity: 7, amountCents: 700, status: "pending", undoUntil: "2026-09-20T12:00:30Z",
    serverNow: "2026-09-20T12:00:00Z", href: null };
  act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: receipt })));
  rerender(<DemoParticipationPanel {...props} sold={18} isSignedIn />);
  expect(screen.getByText(/7 tickets · \$7\.00 reserved/)).toBeTruthy();
  expect(screen.getByTestId("entry-quantity")).toHaveProperty("value", "7");
  expect(screen.getByText(/Entry submitted · Undo available/).closest("aside")?.id).toBe("enter-entry");
  expect(screen.getByRole("timer", { name: "30 seconds left to undo" }).textContent).toBe("30sec");
  expect(screen.getByText(/header counts active entries after confirmation/)).toBeTruthy();
  expect(screen.getByText(/Entry submitted · Undo available/).closest("[role=status]")?.className).toContain("bg-[#ff6a00]");
  expect(screen.getByRole("button", { name: "Undo entry" }).className).toContain("bg-[#bcecff]");
  expect(screen.getByRole("button", { name: "Confirm entry" }).className).toContain("bg-[#31e800]");
  expect(document.querySelector(".fixed[aria-label='Entry confirmations']")).toBeNull();
  actionMocks.resolve.mockResolvedValue({ request: { ...receipt, status: "cancelled" } });
  fireEvent.click(screen.getByRole("button", { name: "Undo entry" }));
  await waitFor(() => expect(actionMocks.resolve).toHaveBeenCalledWith(receipt.requestId, true));
});
test.each(["Undo entry", "Confirm entry"])("a refreshed holder can use %s on the final reserved ticket", async action => {
  const receipt = { requestId: "41414141-4141-4141-8141-414141414141", slug: props.productSlug, title: props.productTitle,
    quantity: 1, amountCents: 100, status: "pending", undoUntil: "2026-11-08T12:00:30Z", serverNow: "2026-11-08T12:00:05Z", href: null };
  actionMocks.list.mockResolvedValue({ requests: [receipt] });
  actionMocks.resolve.mockResolvedValue({ request: { ...receipt, status: "cancelled" } });
  actionMocks.confirm.mockResolvedValue({ request: { ...receipt, status: "accepted", href: "/account/entries" } });
  render(<DemoParticipationPanel {...props} isSignedIn sold={props.capacity} requestHead={{ ready: true, requestId: receipt.requestId, validating: true }} />);
  const button = await screen.findByRole("button", { name: action });
  expect(screen.queryByText("No entries remaining")).toBeNull();
  expect(screen.queryByRole("button", { name: /Enter for/ })).toBeNull();
  fireEvent.click(button);
  if (action === "Undo entry") await waitFor(() => expect(actionMocks.resolve).toHaveBeenCalledWith(receipt.requestId, true));
  else await waitFor(() => expect(actionMocks.confirm).toHaveBeenCalledWith(receipt.requestId));
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test("Confirm entry accepts the saved request and opens My Activity with its exact-entry marker", async () => {
  render(<DemoParticipationPanel {...props} isSignedIn />);
  const receipt = { requestId: "41414141-4141-4141-8141-414141414141", slug: props.productSlug, title: props.productTitle,
    quantity: 1, amountCents: 100, status: "pending" as const, undoUntil: "2026-09-20T12:00:30Z", serverNow: "2026-09-20T12:00:00Z", href: null };
  act(() => window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: receipt })));
  actionMocks.confirm.mockResolvedValue({ request: { ...receipt, status: "accepted", href: "/account/entries?item=test-product&entry=ent_1234" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry" }));
  await waitFor(() => expect(actionMocks.confirm).toHaveBeenCalledWith(receipt.requestId));
  await waitFor(() => expect(actionMocks.replace).toHaveBeenCalledWith("/account/entries?item=test-product&entry=ent_1234"));
  expect(JSON.parse(sessionStorage.getItem(RECENT_ENTRY_STORAGE_KEY) ?? "null")).toMatchObject({ slug: "test-product", entryId: "ent_1234" });
});

test("Add funds opens the funding form and remembers this prize", () => {
  render(<DemoParticipationPanel {...props} isSignedIn />);
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe(
    "/account/wallet?view=history&from=test-product#add-funds",
  );
});

test("both funding links keep the original category, sort and selected quantity", () => {
  const browse = "/browse?category=electronics&sort=fewest-left";
  render(<DemoParticipationPanel {...props} initialQuantity={3} isSignedIn isDemoWallet balanceCents={0} browseReturnHref={browse} />);
  const expected = `/account/wallet?view=history&from=test-product&quantity=3&browse=${encodeURIComponent(browse)}#add-funds`;
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe(expected);
  fireEvent.click(screen.getByRole("button", { name: "Enter for $3.00" }));
  expect(screen.getAllByRole("link", { name: "Add funds" }).length).toBe(2);
  for (const link of screen.getAllByRole("link", { name: "Add funds" })) expect(link.getAttribute("href")).toBe(expected);
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test("selected quantity resumes after sign-in and add funds", () => {
  render(<DemoParticipationPanel {...props} initialQuantity={3} isSignedIn />);
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("3");
  expect(screen.getByRole("button", { name: "Enter for $3.00" })).toBeTruthy();
  const addFunds = screen.getByRole("link", { name: "Add funds" });
  expect(addFunds.getAttribute("href")).toBe("/account/wallet?view=history&from=test-product&quantity=3#add-funds");
  fireEvent.click(addFunds);
  expect(JSON.parse(sessionStorage.getItem("zero-loss-entry-intent-v1") ?? "null")).toMatchObject({ slug: "test-product", quantity: 3 });
});

test("saved count is lowered if fewer tickets remain on return", () => {
  render(<DemoParticipationPanel {...props} sold={18} capacity={20} initialQuantity={5} isSignedIn />);
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("2");
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
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("2");
  expect(screen.queryByText(/Each \$1\.00 entry stands alone/)).toBeNull();
  const href = screen.getByRole("link", { name: "Sign in to enter" }).getAttribute("href")!;
  expect(new URL(href, "https://example.test").searchParams.get("next")).toBe("/items/test-product?quantity=2#enter-entry");
});

test("product urgency follows counts and identifies a full pool", () => {
  const { rerender } = render(<DemoParticipationPanel {...props} sold={7} capacity={20} />);
  expect(screen.getByText(/35% full/)).toBeTruthy();
  expect(screen.queryByText(/Ending soon/i)).toBeNull();
  rerender(<DemoParticipationPanel {...props} sold={19} capacity={20} />);
  expect(screen.getByText("Almost full").parentElement?.style.color).toBe("rgb(255, 255, 255)");
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
  expect(screen.getByRole("img", { name: /How extra chances work/i }).getAttribute("src")).toContain("extra-entry-explainer-trimmed.webp");
  expect(screen.getAllByText("Why does each entry stand alone?")).toHaveLength(1);
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("1");
  expect(screen.getByText(/entry payments never combine into a larger discount/i)).toBeTruthy();

  const saveButton = screen.getByRole("button", { name: "I understand — save my choice" });
  expect(saveButton.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /I understand how extra entries work/i }));
  expect(saveButton.hasAttribute("disabled")).toBe(false);
  fireEvent.click(saveButton);
  await waitFor(() => expect(actionMocks.acknowledge).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("2");
  expect(screen.getByText("2 tickets selected")).toBeTruthy();
  expect(screen.getByText(/Nothing is entered until you press Enter for \$2\.00/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Enter for $2.00" })).toBeTruthy();
  expect(document.querySelector('input[name="quantity"]')?.getAttribute("value")).toBe("2");

  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("3");
});
test("tablet and desktop open the full extra-entry explanation without a disclosure click", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  const dialog = screen.getByRole("dialog", { name: "How Extra Chances Work" });
  await waitFor(() => expect(dialog.querySelector("details")?.open).toBe(true));
  expect(dialog.querySelector("details")?.textContent).toContain("Each option requires its own remaining payment.");
  expect(screen.getByRole("checkbox", { name: /I understand how extra entries work/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: "I understand — save my choice" })).toBeTruthy();
});
test("the explanation opens in a native modal and restores scrolling and focus when closed", () => {
  render(<DemoParticipationPanel {...props} isDemoWallet isSignedIn />);
  const trigger = screen.getByRole("button", { name: "Add one entry" });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "How Extra Chances Work" }) as HTMLDialogElement;
  const close = screen.getByRole("button", { name: "Close extra entry explanation" });
  expect(dialog.tagName).toBe("DIALOG");
  expect(dialog.open).toBe(true);
  expect(document.documentElement.style.overflow).toBe("hidden");
  expect(document.activeElement).toBe(close);
  fireEvent.click(close);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.documentElement.style.overflow).toBe("");
  expect(document.activeElement).toBe(trigger);
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("1");
  expect(actionMocks.acknowledge).not.toHaveBeenCalled();
});

test("an unsuccessful acknowledgment keeps the ticket open without adding an entry", async () => {
  actionMocks.acknowledge.mockResolvedValue({ status: "error", message: "Your choice could not be saved. Please try again." });
  render(<DemoParticipationPanel {...props} isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I understand how extra entries work/i }));
  fireEvent.click(screen.getByRole("button", { name: /I understand.*save my choice/i }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Your choice could not be saved. Please try again.");
  expect(screen.getByRole("dialog", { name: "How Extra Chances Work" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /I understand.*save my choice/i }).hasAttribute("disabled")).toBe(false);
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("1");
  expect(actionMocks.enter).not.toHaveBeenCalled();
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
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("3");
});

test("a lost acknowledgment reply leaves the quantity alone and allows an explicit retry", async () => {
  actionMocks.acknowledge.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ status: "succeeded" });
  render(<DemoParticipationPanel {...props} isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I understand how extra entries work/i }));
  fireEvent.click(screen.getByRole("button", { name: /save my choice/i }));
  expect((await screen.findByRole("alert")).textContent).toContain("Try saving it again");
  expect(screen.getByTestId("entry-quantity")).toHaveProperty("value", "1");
  fireEvent.click(screen.getByRole("button", { name: /save my choice/i }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByTestId("entry-quantity")).toHaveProperty("value", "2");
  expect(actionMocks.acknowledge).toHaveBeenCalledTimes(2);
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test("finishing a save after dismissal cannot advance the dismissed quantity", async () => {
  let finish!: (result: { status: string }) => void;
  actionMocks.acknowledge.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  render(<DemoParticipationPanel {...props} isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I understand how extra entries work/i }));
  fireEvent.click(screen.getByRole("button", { name: /save my choice/i }));
  fireEvent.click(screen.getByRole("button", { name: "Close extra entry explanation" }));
  await act(async () => finish({ status: "succeeded" }));
  expect(screen.getByTestId("entry-quantity")).toHaveProperty("value", "1");
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test("a lost explanation reset reply releases Reset Entry Toast for retry", async () => {
  actionMocks.reset.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ status: "succeeded" });
  render(<DemoParticipationPanel {...props} isPreviewExperience isDemoWallet isSignedIn extraEntryExplainerAcknowledged />);
  fireEvent.click(screen.getByRole("button", { name: "Reset Entry Toast" }));
  await screen.findByText(/couldn’t confirm the explanation reset/);
  fireEvent.click(screen.getByRole("button", { name: "Reset Entry Toast" }));
  await screen.findByText(/Extra-entry explanation reset/);
  expect(screen.getByTestId("entry-quantity")).toHaveProperty("value", "1");
  expect(actionMocks.enter).not.toHaveBeenCalled();
});
test("a stored acknowledgment adds directly without opening the explainer", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn extraEntryExplainerAcknowledged />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("2");
  expect(screen.getByText("2 tickets selected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove one entry" }));
  expect(screen.queryByText("2 tickets selected")).toBeNull();
});
test("a demo customer can reset the saved extra-entry explanation without changing the entry quantity", async () => {
  actionMocks.reset.mockResolvedValue({ status: "succeeded" });
  render(<DemoParticipationPanel {...props} isPreviewExperience isDemoWallet isSignedIn extraEntryExplainerAcknowledged />);
  expect(screen.getByText("Add extra entries")).toBeTruthy();
  expect(screen.queryByText("Click + to add one.")).toBeNull();
  expect(screen.queryByText(/Terms apply/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reset Entry Toast" }));
  await waitFor(() => expect(actionMocks.reset).toHaveBeenCalledTimes(1));
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("1");
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
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("1");
});

test("a full pool cannot start a preview entry", () => {
  render(<DemoParticipationPanel {...props} sold={10} capacity={10} isSignedIn />);
  expect(screen.getByText("0 remaining")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add one entry" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "No entries remaining" }).hasAttribute("disabled")).toBe(true);
  expect(screen.queryByRole("button", { name: "Enter for $1.00" })).toBeNull();
});

test("entry submission is private without an extra sharing choice", async () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  expect(screen.queryByRole("dialog", { name: "Share this pick with your Crew?" })).toBeNull();
  await waitFor(() => expect(actionMocks.enter).toHaveBeenCalledOnce());
  expect((actionMocks.enter.mock.calls[0][1] as FormData).get("shareWithCrew")).toBe("no");
  expect(document.querySelector('input[name="shareWithCrew"]')?.getAttribute("value")).toBe("no");
});

test("insufficient balance opens an actionable toast before sharing or submitting an entry", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$0.25" balanceCents={25} isDemoWallet isSignedIn />);
  const enter = screen.getByRole("button", { name: "Enter for $1.00" });
  enter.focus();
  fireEvent.click(enter);
  expect(screen.getByRole("region", { name: "Insufficient playable balance" })).toBeTruthy();
  expect(readEntryIntent()).toMatchObject({ slug: props.productSlug, quantity: 1 });
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

test("sending an entry clears the unfinished hint before the server response arrives", async () => {
  rememberViewedProduct(props.productSlug);
  saveEntryIntent(props.productSlug, props.productTitle, 1);
  render(<DemoParticipationPanel {...props} balanceCents={500} isDemoWallet isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  expect(readEntryIntent()).toBeNull();
  expect(readViewedProduct()).toBeNull();
  await waitFor(() => expect(actionMocks.enter).toHaveBeenCalled());
});

test("multiple entries update the total and shortfall without losing the selected quantity", () => {
  render(<DemoParticipationPanel {...props} balanceCents={125} isSignedIn extraEntryExplainerAcknowledged />);
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Enter for $3.00" }));
  expect(screen.getByRole("status").textContent).toContain("3 entries cost $3.00");
  expect(screen.getByRole("status").textContent).toContain("$1.75");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss balance notice" }));
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("3");
  fireEvent.click(screen.getByRole("button", { name: "Remove one entry" }));
  expect(screen.getByRole("button", { name: "Enter for $2.00" })).toBeTruthy();
  expect(actionMocks.enter).not.toHaveBeenCalled();
});

test.each([100, null, undefined, NaN])("exact or unavailable balance does not falsely claim insufficient funds: %s", balanceCents => {
  render(<DemoParticipationPanel {...props} balanceCents={balanceCents} isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  expect(screen.queryByRole("region", { name: "Insufficient playable balance" })).toBeNull();
  expect(screen.queryByRole("dialog", { name: "Share this pick with your Crew?" })).toBeNull();
});

test("a server-side balance change shows the funding toast without trusting stale balance numbers", async () => {
  actionMocks.enter.mockResolvedValue({ status: "error", code: "insufficient_balance", message: "Add funds to cover these entries, then return to this prize." });
  render(<DemoParticipationPanel {...props} balanceCents={1000} isSignedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Insufficient playable balance" })).toBeTruthy());
  expect(screen.getByRole("status").textContent).toContain("Your balance no longer covers");
  expect(screen.getByRole("status").textContent).not.toContain("$10.00");
  fireEvent.click(screen.getByRole("button", { name: "Keep browsing" }));
  expect(screen.queryByRole("region", { name: "Insufficient playable balance" })).toBeNull();
});

test("quantity can exceed ten up to actual availability, total uses cents, and reducing stops at one", () => {
  render(<DemoParticipationPanel {...props} entryPrice={0.1} isSignedIn extraEntryExplainerAcknowledged />);
  for (let i = 0; i < 12; i++) fireEvent.click(screen.getByRole("button", { name: "Add one entry" }));
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("11");
  expect(screen.getByRole("button", { name: "Enter for $1.10" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add one entry" }).hasAttribute("disabled")).toBe(true);
  for (let i = 0; i < 12; i++) fireEvent.click(screen.getByRole("button", { name: "Remove one entry" }));
  expect((screen.getByTestId("entry-quantity") as HTMLInputElement).value).toBe("1");
  expect(screen.getByRole("button", { name: "Enter for $0.10" })).toBeTruthy();
});
