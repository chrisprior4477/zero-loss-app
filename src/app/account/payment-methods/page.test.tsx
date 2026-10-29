import { afterEach, expect, test, vi } from "vitest";
const account = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account/context", () => ({ getAccountContext: account }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); } }));
import PaymentMethodsPage from "./page";
afterEach(() => vi.clearAllMocks());
test("the existing payment-methods entrance opens the shared wallet manager", async () => {
  account.mockResolvedValue({ userId: "customer" });
  await expect(PaymentMethodsPage()).rejects.toThrow("redirect:/account/wallet?view=history&panel=methods");
});
test("the payment-methods entrance still requires sign-in", async () => {
  account.mockResolvedValue(null);
  await expect(PaymentMethodsPage()).rejects.toThrow("redirect:/login?next=%2Faccount%2Fpayment-methods");
});
