import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { DemoCard } from "@/lib/payments/demo-card";
const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/payments/actions", () => ({ saveDemoPaymentMethod: vi.fn(), deleteDemoPaymentMethod: vi.fn(), completeDemoFunding: vi.fn(), reconcileDemoFunding: vi.fn() }));
import { saveDemoPaymentMethod, completeDemoFunding } from "@/lib/payments/actions";
import { WalletPaymentMethods } from "./WalletPaymentMethods";
import { WalletCardEditor } from "./WalletCardEditor";
import { DemoFundingForm } from "./DemoFundingForm";
const initialCards: DemoCard[] = [{ token: "demo_card_4242", lastFour: "4242", isDefault: true }];
beforeEach(() => { window.history.replaceState(null, "", "/account/wallet?view=history#balance"); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test("journey 1 opens the editor, saves only a reference, and returns to methods without funding", async () => {
  vi.mocked(saveDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Saved" });
  render(<><a href="#wallet-add-card">Wallet Add Card</a><WalletPaymentMethods enabled savedCards={initialCards} displayName="Demo Customer" /></>);
  fireEvent.click(screen.getByRole("link", { name: "Wallet Add Card" }));
  expect(screen.getByRole("heading", { name: "Add a card" })).toBeTruthy();
  for (const label of ["Cardholder name", "Card number", "Expiry", "Security code"]) expect((screen.getByLabelText(label) as HTMLInputElement).name).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Save card" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Payment methods" })).toBeTruthy());
  const data = vi.mocked(saveDemoPaymentMethod).mock.calls[0][1];
  expect([...data.keys()].sort()).toEqual(["makeDefault", "paymentMethod"]);
  expect(data.get("paymentMethod")).toBe("demo_card_5556");
  expect(screen.getByRole("article", { name: "Saved card 5556" })).toBeTruthy();
  expect(window.location.hash).toBe("#payment-methods");
  expect(screen.getByRole("link", { name: "Back to wallet" }).getAttribute("href")).toBe("#balance");
  expect(screen.getByRole("link", { name: "Continue Shopping" }).getAttribute("href")).toBe("/");
  expect(completeDemoFunding).not.toHaveBeenCalled();
});

test("the editor's See card button toggles a preview without saving or losing entered fields", () => {
  render(<WalletCardEditor token="demo_card_5556" displayName="Demo Customer" onSaved={vi.fn()} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Cardholder name"), { target: { value: "Updated name" } });
  const toggle = screen.getByRole("button", { name: "See card", expanded: false });
  fireEvent.click(toggle);
  expect(screen.getByRole("button", { name: "Hide card", expanded: true })).toBeTruthy();
  expect(document.getElementById(toggle.getAttribute("aria-controls")!)?.hidden).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "See back" }));
  expect(screen.getByRole("button", { name: "See front" })).toBeTruthy();
  fireEvent.click(toggle);
  expect(document.getElementById(toggle.getAttribute("aria-controls")!)?.hidden).toBe(true);
  expect((screen.getByLabelText("Cardholder name") as HTMLInputElement).value).toBe("Updated name");
  expect(saveDemoPaymentMethod).not.toHaveBeenCalled();
});

test("journey 2 preserves decimal amount and request key through card save and server refresh", async () => {
  vi.mocked(saveDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Saved" });
  const props = { requestKey: "original_request_key_01", savedCards: initialCards, displayName: "Demo Customer" };
  const { container, rerender } = render(<DemoFundingForm {...props} />);
  fireEvent.change(screen.getByLabelText("Add specific amount (USD)"), { target: { value: "50.50" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Card" }));
  fireEvent.click(screen.getByRole("button", { name: "Save card" }));
  await waitFor(() => expect(screen.getByRole("form", { name: "Add funds" })).toBeTruthy());
  rerender(<DemoFundingForm {...props} requestKey="refreshed_server_key_02" savedCards={[...initialCards, { token: "demo_card_5556", lastFour: "5556", isDefault: false }]} />);
  expect((screen.getByLabelText("Add specific amount (USD)") as HTMLInputElement).value).toBe("$50.50");
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("5050");
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("original_request_key_01");
  expect(container.querySelector<HTMLInputElement>('[name="paymentMethod"]')?.value).toBe("demo_card_5556");
  expect(container.querySelector<HTMLInputElement>('[name="makeDefault"]')?.value).toBe("false");
  expect(completeDemoFunding).not.toHaveBeenCalled();
});

test("card save failure keeps editable fields and does not return or fund", async () => {
  vi.mocked(saveDemoPaymentMethod).mockResolvedValue({ status: "error", message: "Please try again." });
  const saved = vi.fn();
  render(<WalletCardEditor token="demo_card_5556" displayName="Demo Customer" onSaved={saved} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Save card" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Please try again."));
  expect(saved).not.toHaveBeenCalled();
  expect(completeDemoFunding).not.toHaveBeenCalled();
  expect((screen.getByLabelText("Card number") as HTMLInputElement).value).toBe("5555 5555 5555 5556");
});

test("manual entry rejects real card numbers before the server action", () => {
  render(<WalletCardEditor token="demo_card_5556" displayName="Demo Customer" onSaved={vi.fn()} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Card number"), { target: { value: "4111111111111111" } });
  fireEvent.submit(screen.getByRole("form", { name: "Save payment method" }));
  expect(screen.getByRole("alert").textContent).toContain("Real card details are not accepted");
  expect(saveDemoPaymentMethod).not.toHaveBeenCalled();
});

test("a failed card lookup disables card mutations", () => {
  window.history.replaceState(null, "", "#payment-methods");
  render(<WalletPaymentMethods enabled unavailable savedCards={initialCards} />);
  const panel = within(screen.getByRole("region", { name: "Payment methods" }));
  expect((panel.getByRole("button", { name: "Add Card" }) as HTMLButtonElement).disabled).toBe(true);
  expect((panel.getByRole("button", { name: "Delete Card" }) as HTMLButtonElement).disabled).toBe(true);
  expect(panel.getByRole("alert").textContent).toContain("couldn’t be loaded");
});

test("payment-method default changes use the shared action without a deposit", async () => {
  window.history.replaceState(null, "", "#payment-methods");
  vi.mocked(saveDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Preference saved" });
  render(<WalletPaymentMethods enabled savedCards={initialCards} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Use as my default payment method" }));
  await waitFor(() => expect(saveDemoPaymentMethod).toHaveBeenCalled());
  expect(vi.mocked(saveDemoPaymentMethod).mock.calls[0][1].get("makeDefault")).toBe("false");
  expect(completeDemoFunding).not.toHaveBeenCalled();
});


test("wallet links open panels before client routing and close the deposit editor", () => {
  render(<><a href="#wallet-add-card" onClick={event => event.preventDefault()}>Wallet Add Card</a><a href="#balance">Balance</a><WalletPaymentMethods enabled savedCards={initialCards} /><DemoFundingForm requestKey="navigation_request_key" savedCards={initialCards} /></>);
  fireEvent.click(screen.getByRole("button", { name: "Add Card" }));
  expect(screen.getByText(/Your .* deposit is waiting/)).toBeTruthy();
  fireEvent.click(screen.getByRole("link", { name: "Wallet Add Card" }));
  expect(screen.getAllByRole("form", { name: "Save payment method" })).toHaveLength(1);
  expect(screen.queryByText(/Your .* deposit is waiting/)).toBeNull();
  fireEvent.click(screen.getByRole("link", { name: "Balance" }));
  expect(screen.queryByRole("form", { name: "Save payment method" })).toBeNull();
});



test("legacy payment-method entrances open the manager and normalize an old fragment", () => {
  window.history.replaceState(null, "", "/account/wallet?view=history&panel=methods#account-settings-sections");
  render(<WalletPaymentMethods enabled initialSection="methods" savedCards={initialCards} />);
  expect(screen.getByRole("heading", { name: "Payment methods" })).toBeTruthy();
  expect(window.location.hash).toBe("#payment-methods");
});

test.each([{ width: 390, target: 560 }, { width: 1280, target: 360 }])("payment-method navigation and save land below the header at $width px", async ({ width, target }) => {
  vi.stubGlobal("innerWidth", width);
  vi.stubGlobal("scrollY", 0);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callback(0); return 1; });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return new DOMRect(0, this.id === "payment-methods-controls" ? 700 : this.id === "payment-methods" ? 500 : 0, width, this.tagName === "HEADER" ? 128 : 50);
  });
  vi.mocked(saveDemoPaymentMethod).mockResolvedValue({ status: "succeeded", message: "Saved" });
  render(<><header className="sticky" /><a href="#payment-methods">View payment methods</a><WalletPaymentMethods enabled savedCards={initialCards} displayName="Demo Customer" /></>);
  fireEvent.click(screen.getByRole("link", { name: "View payment methods" }));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: target, behavior: "auto" });
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.click(screen.getByRole("button", { name: "Update card" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Payment methods" })).toBeTruthy());
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: target, behavior: "auto" });
});
