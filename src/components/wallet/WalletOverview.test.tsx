import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import { WalletOverview } from "./WalletOverview";
const empty: WalletSnapshot = { walletAccountId: null, scope: "production", currency: "USD", balanceCents: 0, transactionCount: 0, fundingAvailable: false, entries: [] };
afterEach(cleanup);
test("verified empty snapshot displays zero and no fabricated transactions", () => {
  render(<WalletOverview wallet={empty} previewAuthorized />);
  expect(screen.getByTestId("wallet-balance").textContent).toBe("$0.00");
  expect(screen.getByText("No transactions yet")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText("Pending funding")).toBeNull();
});
test("read failure shows Unavailable, not zero or no-transactions claim", () => {
  render(<WalletOverview wallet={null} previewAuthorized={false} />);
  expect(screen.getByTestId("wallet-balance").textContent).toBe("Unavailable");
  expect(screen.queryByText("$0.00")).toBeNull();
  expect(screen.queryByText("No transactions yet")).toBeNull();
});
test("only existing ledger records are rendered, funding remains disabled even with stale capability", () => {
  render(<WalletOverview wallet={{ ...empty, fundingAvailable: true, balanceCents: 2500, transactionCount: 2, entries: [{ id: "existing-funding", entry_type: "DEPOSIT", amount: 3000, created_at: "2026-09-14T12:00:00Z" }, { id: "existing-refund", entry_type: "REFUND", amount: -500, created_at: "2026-09-14T13:00:00Z" }] }} previewAuthorized />);
  expect(screen.getByText("Refund")).toBeTruthy();
  expect(screen.getByTestId("wallet-balance").textContent).toBe("$25");
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
});
