import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";

const mocks = vi.hoisted(() => ({ account: vi.fn(), card: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/payments/demo-provider", () => ({ DemoPaymentProvider: class { getPaymentMethod = mocks.card; } }));
vi.mock("@/lib/payments/actions", () => ({ saveDemoPaymentMethod: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); } }));
import PaymentMethodsPage from "./page";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("payment ticket stays within Account & Security and preserves the saved test card", async () => {
  mocks.account.mockResolvedValue({ displayName: "Chris Prior", balanceLabel: "$17", fundingEnabled: true, wallet: { scope: "demo" }, activity: storedActivityFixture() });
  mocks.card.mockResolvedValue({ token: "demo_card_4242", lastFour: "4242", isDefault: true });
  render(await PaymentMethodsPage());
  expect(screen.getByRole("heading", { name: "Account & Security" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Payment Methods" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Payment Methods" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/account/profile");
  expect(screen.getByText("Test card •••• 4242")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Update card/ })).toBeTruthy();
});

test("payment method page requires sign-in before reading a card", async () => {
  mocks.account.mockResolvedValue(null);
  await expect(PaymentMethodsPage()).rejects.toThrow("redirect:/login?next=%2Faccount%2Fpayment-methods");
  expect(mocks.card).not.toHaveBeenCalled();
});
