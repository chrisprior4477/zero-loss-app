import { expect, test, vi } from "vitest";
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); } }));
import PaymentMethodsPage from "./page";
test("legacy payment methods enter the wallet workspace, which owns authentication", () => {
  expect(() => PaymentMethodsPage()).toThrow("redirect:/account/wallet?view=history&panel=cards#wallet-content");
});
