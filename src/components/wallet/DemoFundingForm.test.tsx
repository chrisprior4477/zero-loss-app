import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { DemoCard } from "@/lib/payments/demo-card";
const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation, unstable_rethrow: () => {} }));
vi.mock("@/lib/payments/actions", () => ({ completeDemoFunding: vi.fn(), checkDemoDeposit: vi.fn(), reconcileDemoFunding: vi.fn(), saveDemoPaymentMethod: vi.fn(), deleteDemoPaymentMethod: vi.fn() }));
import { completeDemoFunding, checkDemoDeposit, reconcileDemoFunding, saveDemoPaymentMethod, deleteDemoPaymentMethod } from "@/lib/payments/actions";
import { DemoFundingForm, DemoFundingRequests } from "./DemoFundingForm";

const refreshCards: DemoCard[] = [
  { token: "demo_card_4242", lastFour: "4242", isDefault: true, isDepositDefault: true },
  { token: "demo_card_5556", lastFour: "5556", isDefault: false, isDepositDefault: false },
];
test("a background deposit-card change requires new approval before sending the new card", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  const props = { requestKey: "card_refresh_request_01", savedCards: refreshCards };
  const view = render(<DemoFundingForm {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("checkbox"));
  view.rerender(<DemoFundingForm {...props} savedCards={refreshCards.map(card => ({ ...card, isDepositDefault: card.token === "demo_card_5556" }))} />);
  expect(dialog.getByText(/5556/)).toBeTruthy();
  expect((dialog.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  expect((dialog.getByRole("button", { name: "Confirm $25 deposit" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.submit(screen.getByRole("form", { name: "Add funds" }));
  expect(completeDemoFunding).not.toHaveBeenCalled();
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  fireEvent.click(dialog.getByRole("checkbox"));
  fireEvent.click(dialog.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(completeDemoFunding).toHaveBeenCalledTimes(1));
  expect(vi.mocked(completeDemoFunding).mock.calls[0][1].get("paymentMethod")).toBe("demo_card_5556");
});

test.each([{ remaining: refreshCards.slice(1) }, { remaining: [] }])("removing a reviewed wallet card blocks submission even after another refresh: $remaining", ({ remaining }) => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  const props = { requestKey: "card_refresh_request_02", savedCards: refreshCards };
  const view = render(<DemoFundingForm {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("checkbox"));
  view.rerender(<DemoFundingForm {...props} savedCards={remaining} />);
  view.rerender(<DemoFundingForm {...props} savedCards={remaining.map(card => ({ ...card }))} />);
  expect(dialog.getByText(/Cancel and choose another card/)).toBeTruthy();
  expect((dialog.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  expect((dialog.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
  fireEvent.submit(screen.getByRole("form", { name: "Add funds" }));
  expect(completeDemoFunding).not.toHaveBeenCalled();
  expect(sessionStorage.getItem("zero-loss-demo-request:test")).toBeNull();
});

test("an unchanged saved-card refresh preserves deposit approval", () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  const props = { requestKey: "card_refresh_request_03", savedCards: refreshCards };
  const view = render(<DemoFundingForm {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  const checkbox = within(screen.getByRole("dialog")).getByRole("checkbox") as HTMLInputElement;
  fireEvent.click(checkbox);
  view.rerender(<DemoFundingForm {...props} savedCards={refreshCards.map(card => ({ ...card }))} />);
  expect(checkbox.checked).toBe(true);
  expect(completeDemoFunding).not.toHaveBeenCalled();
});

test("entry funding suggests the shortfall and only returns after explicit deposit confirmation", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  const href = "/account/entries/ent_11111111111111111111111111111111?quantity=23&review=entry#add-entries-title";
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  render(<DemoFundingForm requestKey="entry_shortfall_request_01" continueTo={{ title: "PlayStation", href, label: "Back to entry review", entryQuantity: 23, shortfallCents: 100, depositCents: 100 }} />);
  expect((screen.getByLabelText("Add specific amount (USD)") as HTMLInputElement).value).toBe("$1");
  expect(completeDemoFunding).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $1 to your balance?" })).toBeTruthy();
  expect(completeDemoFunding).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $1 deposit" }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(href));
});
test("mobile amount roller offers the requested presets and feeds the exact choice into confirmation", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  const { container } = render(<DemoFundingForm requestKey="roller_amount_request_01" />);
  const select = screen.getByRole("combobox", { name: "Amount (USD)" }) as HTMLSelectElement;
  expect(Array.from(select.options).slice(1).map(option => option.text)).toEqual(["$10", "$25", "$50", "$75", "$100", "$200", "$300", "$400", "$500", "$700", "$1,000"]);
  fireEvent.click(screen.getByRole("button", { name: "Amount (USD) $25" }));
  fireEvent.click(screen.getByRole("radio", { name: "$1,000" }));
  await waitFor(() => expect(screen.queryByRole("radiogroup")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $1000 to your balance?" })).toBeTruthy();
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("100000");
  expect(completeDemoFunding).not.toHaveBeenCalled();
});
test("Add Card opens manual entry and cancel keeps the deposit amount", () => {
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" displayName="Demo Customer" />);
  fireEvent.change(screen.getByLabelText("Add specific amount (USD)"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Card" }));
  expect(screen.getByLabelText("Card number")).toBeTruthy();
  expect(screen.getByText(/Your \$50 deposit is waiting/)).toBeTruthy();
  expect(saveDemoPaymentMethod).not.toHaveBeenCalled();
  expect(completeDemoFunding).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect((screen.getByLabelText("Add specific amount (USD)") as HTMLInputElement).value).toBe("$50");
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("stable_demo_request_001");
});

test("deposit confirmation stays on the page and requires an unchecked acknowledgment, not a password", () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $25 to your balance?" })).toBeTruthy();
  expect(screen.queryByLabelText("Account password")).toBeNull();
  expect(screen.getByRole("button", { name: "Confirm $25 deposit" })).toBeTruthy();
  expect(screen.getByText(/does not limit your rights/)).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(sessionStorage.length).toBe(0);
  fireEvent.change(screen.getByRole("combobox", { name: "Amount (USD)" }), { target: { value: "1000" } });
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $10 to your balance?" })).toBeTruthy();
  expect((screen.getByRole("checkbox", { name: /I confirm this amount/ }) as HTMLInputElement).checked).toBe(false);
  expect(sessionStorage.getItem("zero-loss-demo-request:test")).toBeNull();
});

test("refresh restores an unsubmitted custom deposit without carrying approval forward", () => {
  const props = { requestKey: "unsubmitted_review_key_01", walletId: "wallet-a", savedCards: refreshCards };
  const view = render(<DemoFundingForm {...props} />);
  fireEvent.change(screen.getByLabelText("Add specific amount (USD)"), { target: { value: "37" } });
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("checkbox"));
  view.unmount();
  render(<DemoFundingForm {...props} requestKey="unsubmitted_review_key_02" />);
  const review = within(screen.getByRole("dialog", { name: "Add $37 to your balance?" }));
  expect(review.getByText(/4242/)).toBeTruthy();
  expect((review.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  expect((review.getByRole("button", { name: "Confirm $37 deposit" }) as HTMLButtonElement).disabled).toBe(true);
  expect(completeDemoFunding).not.toHaveBeenCalled();
  expect(sessionStorage.getItem("zero-loss-demo-request:wallet-a")).toBeNull();
});
afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.mocked(completeDemoFunding).mockReset(); vi.mocked(checkDemoDeposit).mockReset(); vi.mocked(reconcileDemoFunding).mockReset(); vi.mocked(saveDemoPaymentMethod).mockReset(); vi.mocked(deleteDemoPaymentMethod).mockReset(); navigation.replace.mockReset(); navigation.refresh.mockReset(); });
test("a rejected confirmation clears the recovery marker and can be retried", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(completeDemoFunding)
    .mockResolvedValueOnce({ status: "error", message: "Check the box to confirm this demo deposit.", beforePayment: true })
    .mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  render(<DemoFundingForm requestKey="stable_demo_request_001" walletId="wallet-a" blocked={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm deposit again" })).toBeTruthy());
  await waitFor(() => expect(sessionStorage.getItem("zero-loss-demo-request:wallet-a")).toBeNull());
  expect(vi.mocked(completeDemoFunding).mock.calls[0]?.[1].get("fundingPolicy")).toBe("funding-confirmation-v1");
  fireEvent.click(screen.getByRole("button", { name: "Confirm deposit again" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(screen.getByText("Demo funds added.")).toBeTruthy());
  expect(vi.mocked(completeDemoFunding).mock.calls[1]?.[1].get("fundingPolicy")).toBe("funding-confirmation-v1");
});
test.each(["", "&from=%2Fbrowse%3Fcategory%3Delectronics%26sort%3Dfewest-left"])("successful funding returns to the product, quantity and shopping context: %s", async context => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} continueTo={{ title: "Samsung TV", href: `/items/samsung-m70h-tv?quantity=4${context}#enter-entry` }} />);
  expect(screen.getByRole("link", { name: "Continue Shopping" }).getAttribute("href")).toBe("/");
  fireEvent.click(screen.getByRole("button", { name: "Add Card" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(container.querySelector<HTMLInputElement>('[name="returnTo"]')?.value).toBe(`/items/samsung-m70h-tv?quantity=4${context}#enter-entry`);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(screen.getByText("Demo funds added.")).toBeTruthy());
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(`/items/samsung-m70h-tv?quantity=4${context}&funded=1#enter-entry`));
  expect(screen.getByRole("link", { name: "Continue your entry" }).getAttribute("href")).toBe(`/items/samsung-m70h-tv?quantity=4${context}&funded=1#enter-entry`);
  expect(screen.getByRole("button", { name: "Add more funds" })).toBeTruthy();
});
test("successful funding returns to the exact purchase option that needed more balance", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  const purchaseHref = "/account/entries?item=babys-essentials-bundle&entry=ent_11111111111111111111111111111111";
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" walletId="wallet-a" continueTo={{ title: "Baby's Essentials Bundle", href: purchaseHref, label: "Back to purchase option" }} />);
  expect(container.querySelector<HTMLInputElement>('[name="returnTo"]')?.value).toBe(purchaseHref);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(purchaseHref));
});
test.each(["lost response", "uncertain server result"])("%s can be checked after refresh without starting a second deposit", async mode => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  if (mode === "lost response") vi.mocked(completeDemoFunding).mockRejectedValueOnce(new TypeError("Failed to fetch"));
  else vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "pending", message: "Check this request." });
  const props = { requestKey: "stable_demo_request_001", walletId: "wallet-a", balanceLabel: "$10" };
  const firstVisit = render(<DemoFundingForm {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await screen.findByRole("button", { name: "Check this deposit" });
  firstVisit.unmount();
  render(<DemoFundingForm {...props} requestKey="another_page_request_02" />);
  vi.mocked(checkDemoDeposit).mockRejectedValueOnce(new TypeError("Offline"))
    .mockResolvedValueOnce({ status: "credited", amount: 2500, balanceCents: 3500 });
  fireEvent.click(await screen.findByRole("button", { name: "Check this deposit" }));
  await screen.findByText(/Check your connection/);
  fireEvent.click(screen.getByRole("button", { name: "Check this deposit" }));
  await screen.findByText("Your $25 demo deposit was credited to your wallet.");
  expect(screen.getByText("Balance after this deposit: $35")).toBeTruthy();
  expect(checkDemoDeposit).toHaveBeenLastCalledWith(props.requestKey, 2500, props.walletId);
  expect(completeDemoFunding).toHaveBeenCalledTimes(1);
  expect(reconcileDemoFunding).not.toHaveBeenCalled();
  expect(sessionStorage.getItem("zero-loss-demo-request:wallet-a")).toBeNull();
});

test("a request that never arrived needs fresh confirmation with the same key", async () => {
  const key = "original_request_key_01";
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key, amount: "100", awaitingReceipt: true, paymentMethod: "demo_card_4242", makeDefault: false }));
  vi.mocked(checkDemoDeposit).mockResolvedValueOnce({ status: "missing" });
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" />);
  fireEvent.click(screen.getByRole("button", { name: "Check this deposit" }));
  fireEvent.click(await screen.findByRole("button", { name: "Review same deposit" }));
  expect(screen.getByRole("dialog", { name: "Add $1 to your balance?" })).toBeTruthy();
  expect(completeDemoFunding).not.toHaveBeenCalled();
  const agree = screen.getByRole("checkbox", { name: /I confirm this amount/ }) as HTMLInputElement;
  expect(agree.checked).toBe(false);
  fireEvent.click(agree);
  fireEvent.click(screen.getByRole("button", { name: "Confirm $1 deposit" }));
  await screen.findByText("Demo funds added.");
  const submitted = vi.mocked(completeDemoFunding).mock.calls[0][1];
  expect(submitted.get("idempotencyKey")).toBe(key);
  expect(submitted.get("amountCents")).toBe("100");
});

test("a pending history record opens the one matching recovery card without posting a credit", () => {
  render(<DemoFundingRequests fundingEnabled requests={[
    { id: "pending", amount: 2500, currency: "USD", status: "processing", created_at: "2026-09-14", idempotencyKey: "pending_request_key_01", reconciliation: "credit_pending" },
  ]} />);
  expect(screen.getByRole("link", { name: "Check this deposit" }).getAttribute("href")).toBe("/account/wallet?view=history&deposit=pending_request_key_01#purchase-deposit");
  expect(reconcileDemoFunding).not.toHaveBeenCalled();
});

test("archived demo deposits are hidden by default but can still be reviewed", () => {
  render(<DemoFundingRequests fundingEnabled canResetDemoHistory hiddenIds={["archived"]} requests={[
    { id: "archived", amount: 2500, currency: "USD", status: "succeeded", created_at: "2026-09-14", idempotencyKey: "archived_request_key_01", reconciliation: "reconciled" },
    { id: "current", amount: 10000, currency: "USD", status: "succeeded", created_at: "2026-09-15", idempotencyKey: "current_request_key_01", reconciliation: "reconciled" },
  ]} />);
  expect(screen.queryByText("Request archived")).toBeNull();
  expect(screen.getByRole("button", { name: "Delete All Demo Deposits" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /View archived demo deposits/ }));
  expect(screen.getByText("Request archived")).toBeTruthy();
});
test("form submits cents, USD and a stable request key", () => {
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("2500");
  expect(container.querySelector<HTMLInputElement>('[name="currency"]')?.value).toBe("USD");
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("stable_demo_request_001");
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByText("Simulation only — no payment will be processed.")).toBeTruthy();
});
test("custom whole-dollar amounts replace the preset and use the same confirmation", () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  const custom = screen.getByLabelText("Add specific amount (USD)") as HTMLInputElement;
  expect(custom.inputMode).toBe("numeric");
  expect(custom.placeholder).toBe("Enter a whole-dollar amount");
  fireEvent.change(custom, { target: { value: "500" } });
  expect(custom.value).toBe("$500");
  expect(custom.checkValidity()).toBe(true);
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("50000");
  expect((screen.getByRole("combobox", { name: "Amount (USD)" }) as HTMLSelectElement).value).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $500 to your balance?" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.change(custom, { target: { value: "275" } });
  expect(custom.value).toBe("$275");
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("27500");
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $275 to your balance?" })).toBeTruthy();
});
test("manual amount opens confirmation, posts the chosen cents and refreshes the ledger balance", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  render(<DemoFundingForm requestKey="stable_demo_request_001" walletId="wallet-a" />);
  const custom = screen.getByLabelText("Add specific amount (USD)") as HTMLInputElement;
  fireEvent.change(custom, { target: { value: "$37" } });
  expect(custom.value).toBe("$37");
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $37 to your balance?" })).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $37 deposit" }));
  await waitFor(() => expect(completeDemoFunding).toHaveBeenCalled());
  expect(vi.mocked(completeDemoFunding).mock.calls[0]?.[1].get("amountCents")).toBe("3700");
  await waitFor(() => expect(navigation.refresh).toHaveBeenCalled());
});
test("a $500 deposit can be confirmed even when earlier deposits exceed $1,000", () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  render(<DemoFundingForm requestKey="stable_demo_request_001" requests={[
    { id: "prior-1", amount: 50000, currency: "USD", status: "succeeded", created_at: "2026-10-14", idempotencyKey: "earlier_request_key_01", reconciliation: "reconciled" },
    { id: "prior-2", amount: 50000, currency: "USD", status: "succeeded", created_at: "2026-10-15", idempotencyKey: "earlier_request_key_02", reconciliation: "reconciled" },
    { id: "prior-3", amount: 5200, currency: "USD", status: "succeeded", created_at: "2026-10-16", idempotencyKey: "earlier_request_key_03", reconciliation: "reconciled" },
  ]} />);
  const custom = screen.getByLabelText("Add specific amount (USD)") as HTMLInputElement;
  fireEvent.change(custom, { target: { value: "500" } });
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $500 to your balance?" })).toBeTruthy();
});
test("choosing a preset clears the custom amount and invalid custom amounts cannot advance", () => {
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  const custom = screen.getByLabelText("Add specific amount (USD)") as HTMLInputElement;
  fireEvent.change(custom, { target: { value: "10000" } });
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(false);
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("1000000");
  fireEvent.change(custom, { target: { value: "0" } });
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("alert").textContent).toContain("at least $1");
  fireEvent.change(screen.getByRole("combobox", { name: "Amount (USD)" }), { target: { value: "10000" } });
  expect(custom.value).toBe("");
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("10000");
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(false);
});
test("unknown or outstanding requests block a new form submission", () => {
  render(<DemoFundingForm requestKey="stable_demo_request_001" blocked />);
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
});
test("Add funds recovers the exact older deposit before showing the credited toast", async () => {
  const request = { id: "older-session", amount: 7300, currency: "USD" as const, status: "succeeded" as const, created_at: "2026-11-10T12:00:00Z", idempotencyKey: "older_deposit_request_01", reconciliation: "credit_pending" as const };
  const requests = [
    ...Array.from({ length: 7 }, (_, index) => ({ ...request, id: `new-${index}`, idempotencyKey: `new_deposit_request_${index}`, amount: 2500, reconciliation: "reconciled" as const })),
    request,
  ];
  vi.mocked(checkDemoDeposit).mockResolvedValueOnce({ status: "credit_pending", sessionId: request.id })
    .mockResolvedValueOnce({ status: "credited", amount: request.amount, balanceCents: 9000 });
  vi.mocked(reconcileDemoFunding).mockResolvedValueOnce({ status: "succeeded", message: "Credited" });
  render(<DemoFundingForm walletId="wallet-a" requestKey="stable_demo_request_001" requests={requests} />);

  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Check this deposit · $73" }));
  expect(screen.getByRole("heading", { name: "Check your $73 deposit" })).toBeTruthy();
  expect(checkDemoDeposit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Check this deposit" }));
  expect(checkDemoDeposit).toHaveBeenCalledWith(request.idempotencyKey, request.amount, "wallet-a");
  expect(screen.queryByLabelText("Deposit confirmation")).toBeNull();
  fireEvent.click(await screen.findByRole("button", { name: "Finish this deposit" }));

  expect((await screen.findByLabelText("Deposit confirmation")).textContent).toContain("$73 credited to your wallet");
  expect(vi.mocked(reconcileDemoFunding).mock.calls[0]?.[1].get("sessionId")).toBe(request.id);
  expect(completeDemoFunding).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss deposit confirmation" }));
  expect(screen.queryByLabelText("Deposit confirmation")).toBeNull();
  expect(screen.getByText("Balance after this deposit: $90")).toBeTruthy();
});
test("failed request list is unavailable, not empty", () => {
  render(<DemoFundingRequests requests={null} fundingEnabled />);
  expect(screen.getByRole("alert").textContent).toContain("unavailable");
  expect(screen.queryByText("No payment deposits yet.")).toBeNull();
});
test.each(["1000", "5050"])("unavailable payment history keeps the original request and %s cents locked for safety", amount => {
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key: "original_request_key_01", amount }));
  const { container } = render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" requests={null} blocked={false} />);
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("original_request_key_01");
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe(amount);
  expect(screen.getByRole("button", { name: "Retry same request" })).toBeTruthy();
  expect((screen.getByRole("combobox", { name: "Amount (USD)" }) as HTMLSelectElement).disabled).toBe(true);
  expect(container.querySelector<HTMLInputElement>('[name="recoveryOnly"]')?.value).toBe("true");
});
test("a browser marker absent from verified payment history cannot freeze a new deposit", async () => {
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key: "old_unaccepted_request_01", amount: "2500" }));
  const { container } = render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" requests={[]} blocked={false} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Add funds" })).toBeTruthy());
  expect(sessionStorage.getItem("zero-loss-demo-request:wallet-a")).toBeNull();
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("new_server_render_key_02");
  const amount = screen.getByRole("combobox", { name: "Amount (USD)" }) as HTMLSelectElement;
  expect(amount.disabled).toBe(false);
  fireEvent.change(amount, { target: { value: "10000" } });
  expect(amount.value).toBe("10000");
});

test("a completed deposit marker becomes a new Add funds form after demo funds are cleared", async () => {
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key: "original_request_key_01", amount: "2500", paymentMethod: "demo_card_4242", makeDefault: true }));
  const { container } = render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" requests={[
    { id: "paid-session", amount: 2500, currency: "USD", status: "succeeded", created_at: "2026-10-14", idempotencyKey: "original_request_key_01", reconciliation: "reconciled" },
  ]} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Add funds" })).toBeTruthy());
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("new_server_render_key_02");
  expect(sessionStorage.getItem("zero-loss-demo-request:wallet-a")).toBeNull();
  expect(screen.getByRole("region", { name: "Add Credit Card" })).toBeTruthy();
});

test("an interrupted matching deposit can be retried while new deposits are blocked", async () => {
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key: "original_request_key_01", amount: "2500", paymentMethod: "demo_card_4242", makeDefault: true }));
  const { container } = render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" requests={[
    { id: "pending-session", amount: 2500, currency: "USD", status: "processing", created_at: "2026-10-14", idempotencyKey: "original_request_key_01", reconciliation: "credit_pending" },
  ]} />);
  const retry = screen.getByRole("button", { name: "Retry same request" }) as HTMLButtonElement;
  expect(retry.disabled).toBe(false);
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("original_request_key_01");
});

test.each(["button", "wallet link"])("a completed deposit can start again through the %s", async (entrance) => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" walletId="wallet-a" />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Deposit complete" })).toBeTruthy());
  expect(screen.queryByRole("form", { name: "Add funds" })).toBeNull();
  expect(screen.getByRole("link", { name: "Back to wallet" }).getAttribute("href")).toBe("#balance");
  if (entrance === "button") fireEvent.click(screen.getByRole("button", { name: "Add more funds" }));
  else { window.history.replaceState(null, "", "#add-funds"); fireEvent(window, new HashChangeEvent("hashchange")); }

  expect(screen.getByRole("region", { name: "Add Credit Card" })).toBeTruthy();
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).not.toBe("stable_demo_request_001");

});

test("a previously credited deposit keeps its original prize continuation without claiming new funds", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "already_credited", message: "This deposit was already credited. No new funds were added." });
  render(<DemoFundingForm requestKey="stable_demo_request_001" walletId="wallet-a" continueTo={{ title: "Samsung TV", href: "/items/samsung-m70h-tv#enter-entry" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  const continuation = await screen.findByRole("link", { name: /Continue your entry/ });
  expect(continuation.getAttribute("href")).toBe("/items/samsung-m70h-tv?funded=1#enter-entry");
  expect(screen.getByRole("status").textContent).toContain("No new funds were added");
  expect(navigation.replace).not.toHaveBeenCalled();
});
test("an already credited purchase-option deposit offers a safe return without claiming new funds", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  const purchaseHref = "/account/entries?item=babys-essentials-bundle&entry=ent_11111111111111111111111111111111";
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "already_credited", message: "This deposit was already credited. No new funds were added." });
  render(<DemoFundingForm requestKey="stable_demo_request_001" walletId="wallet-a" continueTo={{ title: "Baby's Essentials Bundle", href: purchaseHref, label: "Back to purchase option" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(screen.getByRole("link", { name: "Back to purchase option" }).getAttribute("href")).toBe(purchaseHref));
  expect(screen.getByRole("status").textContent).toContain("No new funds were added");
  expect(navigation.replace).not.toHaveBeenCalled();
});

test("supplied test-card details are display-only and never submitted", () => {
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  expect(screen.getByRole("region", { name: "Add Credit Card" })).toBeTruthy();
  expect(screen.getAllByText("4242 4242 4242 4242").length).toBeGreaterThan(0);
  const form = new FormData(container.querySelector("form")!);
  expect(form.get("paymentMethod")).toBe("demo_card_4242");
  expect(form.get("makeDefault")).toBe("false");
  expect([...form.values()]).not.toContain("4242 4242 4242 4242");
  expect([...form.values()]).not.toContain("123");
});

test("saved default is restored and customer may opt out", async () => {
  vi.mocked(saveDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Saved" });
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} savedCard={{ token: "demo_card_4242", lastFour: "4242", isDefault: true }} />);
  const checkbox = screen.getByRole("checkbox", { name: "Use as my default payment method" }) as HTMLInputElement;
  expect(checkbox.checked).toBe(true);
  fireEvent.click(checkbox);
  await waitFor(() => expect(container.querySelector<HTMLInputElement>('[name="makeDefault"]')?.value).toBe("false"));
});

test("additional sample cards form a two-card selection and can be saved", async () => {
  vi.mocked(saveDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Saved" });
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} savedCards={[{ token: "demo_card_4242", lastFour: "4242", isDefault: true }]} />);
  fireEvent.click(screen.getByRole("button", { name: /Add another card/ }));
  fireEvent.change(screen.getByLabelText("Cardholder name"), { target: { value: "Demo Customer" } });
  fireEvent.click(screen.getByRole("button", { name: "Save card" }));
  await waitFor(() => expect(saveDemoPaymentMethod).toHaveBeenCalled());
  expect(vi.mocked(saveDemoPaymentMethod).mock.calls[0]?.[1].get("paymentMethod")).toBe("demo_card_5556");
  expect(container.querySelectorAll("article")).toHaveLength(2);
});

test("saved card deletion asks for confirmation and leaves deposit history untouched", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(deleteDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Test card removed. Earlier deposits remain unchanged." });
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} savedCards={[
    { token: "demo_card_4242", lastFour: "4242", isDefault: true },
    { token: "demo_card_5556", lastFour: "5556", isDefault: false },
  ]} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Delete Card" })[0]);
  expect(screen.getByText("Are you sure you want to delete this card?")).toBeTruthy();
  expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("30 seconds");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(deleteDemoPaymentMethod).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: "Delete Card" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
  await waitFor(() => expect(deleteDemoPaymentMethod).toHaveBeenCalledWith("demo_card_4242"));
  await waitFor(() => expect(container.querySelectorAll("article")).toHaveLength(1));
  expect(container.querySelector<HTMLInputElement>('[name="paymentMethod"]')?.value).toBe("demo_card_5556");
  expect(container.querySelector<HTMLInputElement>('[name="makeDefault"]')?.value).toBe("false");
  expect(navigation.refresh).toHaveBeenCalled();
});

test("removing the only saved card blocks funding until another card is chosen", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(deleteDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Test card removed." });
  render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} savedCards={[{ token: "demo_card_4242", lastFour: "4242", isDefault: true }]} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Delete Card" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
  await waitFor(() => expect(screen.getByText("No card selected. Add a sample card above to continue.")).toBeTruthy());
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  vi.mocked(saveDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Saved" });
  fireEvent.click(screen.getByRole("button", { name: "+ Add another card" }));
  fireEvent.change(screen.getByLabelText("Cardholder name"), { target: { value: "Demo Customer" } });
  fireEvent.click(screen.getByRole("button", { name: "Save card" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Add funds" })).toBeTruthy());
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(false);
});

test("retry restores and locks the original default preference, not the current preference", () => {
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key: "original_request_key_01", amount: "1000", paymentMethod: "demo_card_4242", makeDefault: true }));
  const { container } = render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" blocked={false} requests={[
    { id: "pending-session", amount: 1000, currency: "USD", status: "processing", created_at: "2026-10-14", idempotencyKey: "original_request_key_01", reconciliation: "credit_pending" },
  ]} />);
  const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
  expect(checkbox.checked).toBe(true);
  expect(checkbox.disabled).toBe(true);
  expect(container.querySelector<HTMLInputElement>('[name="recoveryOnly"]')?.value).toBe("false");
});

test("failed saved-card lookup blocks a fresh payment rather than overwriting the preference", () => {
  render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} cardUnavailable />);
  expect(screen.getByRole("alert").textContent).toContain("couldn’t be loaded");
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
});
test("pending request offers recovery but discrepancy requires review", () => {
  render(<DemoFundingRequests fundingEnabled requests={[
    { id: "pending", amount: 2500, currency: "USD", status: "processing", created_at: "2026-09-14", idempotencyKey: "pending_request_key_01", reconciliation: "credit_pending" },
    { id: "bad", amount: 2500, currency: "USD", status: "succeeded", created_at: "2026-09-14", idempotencyKey: "aaaaaaaaaaaaaaaa", reconciliation: "discrepancy" },
  ]} />);
  expect(screen.getAllByRole("link", { name: "Check this deposit" })).toHaveLength(1);
  expect(screen.getByRole("alert").textContent).toContain("operator review");
});

test("payment deposits return to their heading when the full list is collapsed", () => {
  const requests = Array.from({ length: 7 }, (_, index) => ({ id: `request-${index}`, amount: 100, currency: "USD" as const, status: "succeeded", created_at: "2026-09-14", idempotencyKey: `payment_request_key_${index}`, reconciliation: "reconciled" as const }));
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  try {
    render(<DemoFundingRequests fundingEnabled requests={requests} />);
    const section = screen.getByRole("region", { name: "Payment deposits" });
    const heading = screen.getByRole("heading", { name: "Payment deposits" });
    expect(screen.getByRole("link", { name: "Continue shopping" }).getAttribute("href")).toBe("/");
    expect(screen.getAllByText("Payment & credit matched")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: /See more deposits/ }));
    expect(screen.getAllByText("Payment & credit matched")).toHaveLength(7);
    expect(scrollIntoView).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(screen.getAllByText("Payment & credit matched")).toHaveLength(5);
    expect(document.activeElement).toBe(heading);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(section);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  } finally {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  }
});

test("desktop receipts start with the six most recent, and See more reveals every older receipt", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  try {
    const requests = Array.from({ length: 15 }, (_, index) => ({
      id: `r${index}`, amount: (index + 1) * 100, status: "succeeded", currency: "USD" as const,
      created_at: "2026-10-01T12:00:00Z", postedAt: new Date(Date.UTC(2026, 10, 1 + index)).toISOString(),
      idempotencyKey: `request_key_example_${index}`, reconciliation: "reconciled" as const,
    }));
    render(<DemoFundingRequests requests={requests} fundingEnabled />);
    expect(screen.getAllByRole("listitem").map(item => item.querySelector("p span")?.textContent)).toEqual(
      ["$15 USD", "$14 USD", "$13 USD", "$12 USD", "$11 USD", "$10 USD"]);
    fireEvent.click(screen.getByRole("button", { name: "See more deposits (9 remaining)" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(15);
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  } finally {
    vi.unstubAllGlobals();
  }
});


test("whole-dollar notice can close or save acknowledgement without changing or submitting the amount", () => {
  const view = render(<DemoFundingForm requestKey="whole_notice_check_001" walletId="notice-wallet" />);
  const input = screen.getByLabelText("Add specific amount (USD)") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "50.50" } });
  expect(screen.getByText("Only whole dollar amounts are accepted for deposits.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close whole-dollar notice" }));
  expect(input.value).toBe("$50.50");
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(input, { target: { value: "50" } });
  fireEvent.change(input, { target: { value: "50.50" } });
  fireEvent.click(screen.getByRole("button", { name: "I understand and save" }));
  expect(completeDemoFunding).not.toHaveBeenCalled();
  expect(input.value).toBe("$50.50");
  view.unmount();
  render(<DemoFundingForm requestKey="whole_notice_check_002" walletId="notice-wallet" />);
  fireEvent.change(screen.getByLabelText("Add specific amount (USD)"), { target: { value: "1.25" } });
  expect(screen.queryByRole("button", { name: "I understand and save" })).toBeNull();
  expect(screen.getByRole("alert").textContent).toContain("whole dollars");
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
});

test("desktop decimal typing is rejected without converting $50.50 into $5050", () => {
  const {container}=render(<DemoFundingForm requestKey="whole_amount_check_001" />);
  const input=screen.getByLabelText("Add specific amount (USD)") as HTMLInputElement;
  for(const value of ["5","$50","$50.","$50.5","$50.50"]) fireEvent.change(input,{target:{value}});
  expect(input.value).toBe("$50.50");
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("");
  expect((screen.getByRole("button",{name:"Add funds"}) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("alert").textContent).toContain("whole dollars");
  expect(completeDemoFunding).not.toHaveBeenCalled();
});

test.each(["1.25", "50.50", "50.505", "50,50", "-50", "1e3"])("invalid %s is not changed into a larger deposit", value => {
  render(<DemoFundingForm requestKey="decimal_amount_check_002" />);
  fireEvent.change(screen.getByLabelText("Add specific amount (USD)"), { target: { value } });
  expect(screen.getByLabelText("Add specific amount (USD)")).toHaveProperty("value", `$${value}`);
  expect(screen.getByRole("button", { name: "Add funds" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("alert").textContent).toContain("whole dollars");
});
