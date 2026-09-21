import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WalletOverview } from "./WalletOverview";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("./DemoFundingForm", () => ({ DemoFundingForm: () => null, DemoFundingRequests: () => null }));
afterEach(cleanup);
const entry = { id: "11111111-1111-4111-8111-111111111111", entry_type: "DEPOSIT", amount: 100, created_at: "2026-09-21T12:00:00Z" };
const wallet: WalletSnapshot = { walletAccountId: entry.id, scope: "demo", currency: "USD", balanceCents: 100, fundingAvailable: true, entries: [entry], transactionCount: 1 };
test("a recent notification highlights exactly its transaction and retains the support shortcut", () => {
  render(<WalletOverview wallet={wallet} selectedTransaction={{ requested: true, entry }} />);
  expect(document.getElementById(`transaction-${entry.id}`)?.getAttribute("data-selected")).toBe("true");
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href")).toBe(`/support?transaction=${entry.id}`);
});
test("an older transaction stays accessible without inflating the recent history count", () => {
  render(<WalletOverview wallet={{ ...wallet, entries: [], transactionCount: 51 }} selectedTransaction={{ requested: true, entry }} />);
  expect(screen.getByRole("region", { name: "Selected older transaction" })).toBeTruthy();
  expect(document.getElementById(`transaction-${entry.id}`)).toBeTruthy();
  expect(screen.getByText("Showing 0 of 51 transactions")).toBeTruthy();
  expect(screen.getByTestId("wallet-balance").textContent).toBe("$1");
});
test("unavailable selection preserves the customer's actual history and provides feedback", () => {
  render(<WalletOverview wallet={wallet} selectedTransaction={{ requested: true, entry: null }} />);
  expect(screen.getByRole("status").textContent).toContain("could not be opened for this account");
  expect(document.querySelector('[data-selected="true"]')).toBeNull();
  expect(screen.getByText("Funds added")).toBeTruthy();
});
