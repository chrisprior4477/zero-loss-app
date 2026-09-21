import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/lib/payments/actions", () => ({ completeDemoFunding: vi.fn(), reconcileDemoFunding: vi.fn() }));
import { DemoFundingForm, DemoFundingRequests } from "./DemoFundingForm";
test("deposit confirmation stays on the page and asks for amount approval and password", () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $25 to your balance?" })).toBeTruthy();
  expect((screen.getByLabelText("Account password") as HTMLInputElement).type).toBe("password");
  expect(screen.getByRole("button", { name: "Confirm $25 deposit" })).toBeTruthy();
  expect(screen.getByText(/does not limit your rights/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Account password"), { target: { value: "local-test-only" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.change(screen.getByLabelText("Amount (USD)"), { target: { value: "1000" } });
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  expect(screen.getByRole("dialog", { name: "Add $10 to your balance?" })).toBeTruthy();
  expect((screen.getByLabelText("Account password") as HTMLInputElement).value).toBe("");
  expect((screen.getByRole("checkbox", { name: /I confirm this amount/ }) as HTMLInputElement).checked).toBe(false);
  expect(sessionStorage.length).toBe(0);
});
afterEach(() => { cleanup(); sessionStorage.clear(); });
test("form submits cents, USD and a stable request key", () => {
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("2500");
  expect(container.querySelector<HTMLInputElement>('[name="currency"]')?.value).toBe("USD");
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("stable_demo_request_001");
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByText("Simulation only — no payment will be processed.")).toBeTruthy();
});
test("unknown or outstanding requests block a new form submission", () => {
  render(<DemoFundingForm requestKey="stable_demo_request_001" blocked />);
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
});
test("failed request list is unavailable, not empty", () => {
  render(<DemoFundingRequests requests={null} fundingEnabled />);
  expect(screen.getByRole("alert").textContent).toContain("unavailable");
  expect(screen.queryByText("No funding requests yet.")).toBeNull();
});
test("reload restores the original payment key and amount, never a fresh payment", () => {
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key: "original_request_key_01", amount: "1000" }));
  const { container } = render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" blocked={false} />);
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("original_request_key_01");
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("1000");
  expect(screen.getByRole("button", { name: "Retry same request" })).toBeTruthy();
  expect(container.querySelector<HTMLInputElement>('[name="recoveryOnly"]')?.value).toBe("true");
});

test("test card is read-only and card credentials are never submitted", () => {
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  expect(screen.getByRole("region", { name: "Add Credit Card" })).toBeTruthy();
  for (const name of ["Test card number", "Test card expiry", "Test card security code"]) {
    const input = screen.getByLabelText(name) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.name).toBe("");
  }
  const form = new FormData(container.querySelector("form")!);
  expect(form.get("paymentMethod")).toBe("demo_card_4242");
  expect(form.get("makeDefault")).toBe("false");
  expect([...form.values()]).not.toContain("4242 4242 4242 4242");
  expect([...form.values()]).not.toContain("123");
});

test("saved default is restored and customer may opt out", () => {
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} savedCard={{ token: "demo_card_4242", lastFour: "4242", isDefault: true }} />);
  const checkbox = screen.getByRole("checkbox", { name: "Use as my default payment method" }) as HTMLInputElement;
  expect(checkbox.checked).toBe(true);
  expect(container.querySelector("details")?.open).toBe(false);
  fireEvent.click(checkbox);
  expect(container.querySelector<HTMLInputElement>('[name="makeDefault"]')?.value).toBe("false");
});

test("retry restores and locks the original default preference, not the current preference", () => {
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key: "original_request_key_01", amount: "1000", paymentMethod: "demo_card_4242", makeDefault: true }));
  const { container } = render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" blocked={false} />);
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
    { id: "pending", amount: 2500, currency: "USD", status: "processing", created_at: "2026-09-14", reconciliation: "credit_pending" },
    { id: "bad", amount: 2500, currency: "USD", status: "succeeded", created_at: "2026-09-14", reconciliation: "discrepancy" },
  ]} />);
  expect(screen.getAllByRole("button", { name: "Finish / check" })).toHaveLength(1);
  expect(screen.getByRole("alert").textContent).toContain("operator review");
});
