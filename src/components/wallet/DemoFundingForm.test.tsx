import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/lib/payments/actions", () => ({ completeDemoFunding: vi.fn(), reconcileDemoFunding: vi.fn(), saveDemoPaymentMethod: vi.fn() }));
import { completeDemoFunding, saveDemoPaymentMethod } from "@/lib/payments/actions";
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
afterEach(() => { cleanup(); sessionStorage.clear(); vi.mocked(completeDemoFunding).mockReset(); vi.mocked(saveDemoPaymentMethod).mockReset(); });
test("a rejected password clears the recovery marker and can be corrected", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(completeDemoFunding)
    .mockResolvedValueOnce({ status: "error", message: "We couldn’t verify your password.", beforePayment: true })
    .mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  render(<DemoFundingForm requestKey="stable_demo_request_001" walletId="wallet-a" blocked={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.change(screen.getByLabelText("Account password"), { target: { value: "wrong-password" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Try password again" })).toBeTruthy());
  expect(sessionStorage.getItem("zero-loss-demo-request:wallet-a")).toBeNull();
  expect(vi.mocked(completeDemoFunding).mock.calls[0]?.[1].get("password")).toBe("wrong-password");
  fireEvent.click(screen.getByRole("button", { name: "Try password again" }));
  fireEvent.change(screen.getByLabelText("Account password"), { target: { value: "correct-password" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(screen.getByText("Demo funds added.")).toBeTruthy());
  expect(vi.mocked(completeDemoFunding).mock.calls[1]?.[1].get("password")).toBe("correct-password");
});
test("successful funding offers an explicit return to the selected product", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "succeeded", message: "Demo funds added." });
  render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} continueTo={{ title: "Samsung TV", href: "/items/samsung-m70h-tv?quantity=4#enter-entry" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.change(screen.getByLabelText("Account password"), { target: { value: "local-test-only" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(screen.getByText("Demo funds added.")).toBeTruthy());
  expect(screen.getByRole("link", { name: "Continue your entry" }).getAttribute("href")).toBe("/items/samsung-m70h-tv?quantity=4#enter-entry");
  expect(screen.getByRole("button", { name: "Add more funds" })).toBeTruthy();
});
test("an uncertain payment keeps its recovery marker and request key", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(completeDemoFunding).mockResolvedValueOnce({ status: "pending", message: "Check this request." });
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" walletId="wallet-a" blocked={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.change(screen.getByLabelText("Account password"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this amount/ }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm $25 deposit" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Retry same request" })).toBeTruthy());
  expect(JSON.parse(sessionStorage.getItem("zero-loss-demo-request:wallet-a") ?? "null")).toMatchObject({ key: "stable_demo_request_001", amount: "2500" });
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("stable_demo_request_001");
});
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
  expect(screen.queryByText("No payment deposits yet.")).toBeNull();
});
test("reload restores the original payment key and amount, never a fresh payment", () => {
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key: "original_request_key_01", amount: "1000" }));
  const { container } = render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" blocked={false} />);
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("original_request_key_01");
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("1000");
  expect(screen.getByRole("button", { name: "Retry same request" })).toBeTruthy();
  expect(container.querySelector<HTMLInputElement>('[name="recoveryOnly"]')?.value).toBe("true");
});

test("supplied test-card details are display-only and never submitted", () => {
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  expect(screen.getByRole("region", { name: "Add Credit Card" })).toBeTruthy();
  expect(screen.getByText("4242 4242 4242 4242")).toBeTruthy();
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
  expect(screen.getByText("Test card •••• 5556")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save this card" }));
  await waitFor(() => expect(saveDemoPaymentMethod).toHaveBeenCalled());
  expect(vi.mocked(saveDemoPaymentMethod).mock.calls[0]?.[1].get("paymentMethod")).toBe("demo_card_5556");
  expect(container.querySelectorAll("article")).toHaveLength(2);
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

test("payment deposits initially show five and expand on demand", () => {
  const requests = Array.from({ length: 7 }, (_, index) => ({ id: `request-${index}`, amount: 100, currency: "USD" as const, status: "succeeded", created_at: "2026-09-14", reconciliation: "reconciled" as const }));
  render(<DemoFundingRequests fundingEnabled requests={requests} />);
  expect(screen.getByRole("region", { name: "Payment deposits" })).toBeTruthy();
  expect(screen.getAllByText("Payment & credit matched")).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: /See all 7 payment deposits/ }));
  expect(screen.getAllByText("Payment & credit matched")).toHaveLength(7);
});
