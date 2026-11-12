import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), check: vi.fn(), finish: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/payments/actions", () => ({ checkDemoDeposit: mocks.check, reconcileDemoFunding: mocks.finish }));
vi.mock("./WalletCardEditor", () => ({ revealWalletSection: vi.fn() }));
vi.mock("@/components/account/AccountSettingsLandingScroll", () => ({ AccountSettingsLandingScroll: () => null }));
import { PurchaseDepositRecovery } from "./PurchaseDepositRecovery";
const key = "purchase_fund_11111111-1111-4111-8111-111111111111";
const receipt: DemoFundingRequest = { id: "receipt-one", amount: 7300, currency: "USD", status: "succeeded", reconciliation: "reconciled", created_at: "2026-11-10T12:00:00Z", idempotencyKey: key, sampleCard: "demo_card_0002" };
const wallet: WalletSnapshot = { walletAccountId: "wallet-owner", scope: "demo", currency: "USD", balanceCents: 39900, fundingAvailable: true, transactionCount: 1, entries: [] };
const continueTo = { title: "Nintendo Switch", href: "/account/purchase-options/nintendo-switch?option=ent_11111111111111111111111111111111&resume=wallet&choice=22222222-2222-4222-8222-222222222222" };
const props = { requestKey: key, requests: [receipt], wallet, continueTo, fundingEnabled: true };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("opens the exact older receipt and offers the original purchase review without paying again", () => {
  render(<PurchaseDepositRecovery {...props} requests={[...Array.from({ length: 12 }, (_, i) => ({ ...receipt, id: `new-${i}`, idempotencyKey: `other-${i}`, amount: 100 })), receipt]} />);
  expect(screen.getByText("$73 deposit")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Current balance: $399");
  expect(screen.getByRole("link", { name: "Return to purchase review" }).getAttribute("href")).toBe(continueTo.href);
  expect(mocks.finish).not.toHaveBeenCalled(); expect(mocks.check).not.toHaveBeenCalled();
});

test.each([null, [], [{ ...receipt, idempotencyKey: "another-account-or-deposit" }]])("missing or unreadable exact receipt never substitutes another payment: %j", requests => {
  render(<PurchaseDepositRecovery {...props} requests={requests} />);
  expect(screen.queryByRole("link", { name: "Return to purchase review" })).toBeNull();
  expect(screen.queryByText("$73 deposit")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Check again" }));
  expect(mocks.refresh).toHaveBeenCalledOnce(); expect(mocks.finish).not.toHaveBeenCalled();
});

test("a pending deposit finishes the original session and only then offers purchase review", async () => {
  mocks.check.mockResolvedValueOnce({ status: "credit_pending", sessionId: receipt.id }).mockResolvedValueOnce({ status: "credited", amount: 7300, balanceCents: 39900 });
  mocks.finish.mockResolvedValue({ status: "succeeded", message: "Saved" });
  render(<PurchaseDepositRecovery {...props} requests={[{ ...receipt, reconciliation: "credit_pending" }]} />);
  fireEvent.click(screen.getByRole("button", { name: "Check this deposit" }));
  await screen.findByRole("button", { name: "Finish this deposit" });
  expect(screen.queryByRole("link", { name: "Return to purchase review" })).toBeNull();
  expect(mocks.check).toHaveBeenCalledWith(key, 7300, wallet.walletAccountId);
  fireEvent.click(screen.getByRole("button", { name: "Finish this deposit" }));
  await screen.findByRole("link", { name: "Return to purchase review" });
  expect(mocks.finish).toHaveBeenCalledOnce();
  expect(mocks.finish.mock.calls[0][1].get("sessionId")).toBe(receipt.id);
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
});

test("discrepancy requires support and never offers another funding action", () => {
  render(<PurchaseDepositRecovery {...props} requests={[{ ...receipt, reconciliation: "discrepancy" }]} />);
  expect(screen.getByRole("alert").textContent).toContain("needs review");
  expect(screen.getByRole("link", { name: "Contact Support" })).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
