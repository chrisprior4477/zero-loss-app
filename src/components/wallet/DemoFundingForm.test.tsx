import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
vi.mock("@/lib/payments/actions", () => ({ completeDemoFunding: vi.fn(), reconcileDemoFunding: vi.fn() }));
import { DemoFundingForm, DemoFundingRequests } from "./DemoFundingForm";
afterEach(() => { cleanup(); sessionStorage.clear(); });
test("form submits cents, USD and a stable request key", () => {
  const { container } = render(<DemoFundingForm requestKey="stable_demo_request_001" blocked={false} />);
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("2500");
  expect(container.querySelector<HTMLInputElement>('[name="currency"]')?.value).toBe("USD");
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("stable_demo_request_001");
  expect((screen.getByRole("button", { name: "Add demo funds" }) as HTMLButtonElement).disabled).toBe(false);
});
test("unknown or outstanding requests block a new form submission", () => {
  render(<DemoFundingForm requestKey="stable_demo_request_001" blocked />);
  expect((screen.getByRole("button", { name: "Add demo funds" }) as HTMLButtonElement).disabled).toBe(true);
});
test("failed request list is unavailable, not empty", () => {
  render(<DemoFundingRequests requests={null} fundingEnabled />);
  expect(screen.getByRole("alert").textContent).toContain("unavailable");
  expect(screen.queryByText("No demo funding requests yet.")).toBeNull();
});
test("reload restores the original payment key and amount, never a fresh payment", () => {
  sessionStorage.setItem("zero-loss-demo-request:wallet-a", JSON.stringify({ key: "original_request_key_01", amount: "1000" }));
  const { container } = render(<DemoFundingForm walletId="wallet-a" requestKey="new_server_render_key_02" blocked={false} />);
  expect(container.querySelector<HTMLInputElement>('[name="idempotencyKey"]')?.value).toBe("original_request_key_01");
  expect(container.querySelector<HTMLInputElement>('[name="amountCents"]')?.value).toBe("1000");
  expect(screen.getByRole("button", { name: "Retry same request" })).toBeTruthy();
});
test("pending request offers recovery but discrepancy requires review", () => {
  render(<DemoFundingRequests fundingEnabled requests={[
    { id: "pending", amount: 2500, currency: "USD", status: "processing", created_at: "2026-09-14", reconciliation: "credit_pending" },
    { id: "bad", amount: 2500, currency: "USD", status: "succeeded", created_at: "2026-09-14", reconciliation: "discrepancy" },
  ]} />);
  expect(screen.getAllByRole("button", { name: "Finish / check" })).toHaveLength(1);
  expect(screen.getByRole("alert").textContent).toContain("operator review");
});
