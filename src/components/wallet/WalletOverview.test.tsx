import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { WalletOverview } from "./WalletOverview";
const empty: WalletSnapshot = { walletAccountId: null, scope: "production", currency: "USD", balanceCents: 0, transactionCount: 0, fundingAvailable: false, entries: [] };
afterEach(cleanup);
test("verified empty snapshot displays zero and no fabricated transactions", () => {
  render(<WalletOverview wallet={empty} />);
  expect(screen.getByTestId("wallet-balance").textContent).toBe("$0.00");
  expect(screen.getByText("No transactions yet")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Add Card" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText("Pending funding")).toBeNull();
});
test("read failure shows Unavailable, not zero or no-transactions claim", () => {
  render(<WalletOverview wallet={null} />);
  expect(screen.getByTestId("wallet-balance").textContent).toBe("Unavailable");
  expect(screen.queryByText("$0.00")).toBeNull();
  expect(screen.queryByText("No transactions yet")).toBeNull();
});
test("only existing ledger records are rendered, funding remains disabled even with stale capability", () => {
  render(<WalletOverview wallet={{ ...empty, fundingAvailable: true, balanceCents: 2500, transactionCount: 2, entries: [{ id: "existing-funding", entry_type: "DEPOSIT", amount: 3000, created_at: "2026-09-14T12:00:00Z" }, { id: "existing-refund", entry_type: "REFUND", amount: -500, created_at: "2026-09-14T13:00:00Z" }] }} />);
  expect(screen.getByText("Refund")).toBeTruthy();
  expect(screen.getByTestId("wallet-balance").textContent).toBe("$25");
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
});
test("wallet layout exposes responsive transaction filters without replacing ledger data", () => {
  render(<WalletOverview wallet={{ ...empty, balanceCents: 2500, transactionCount: 2, entries: [{ id: "funding", entry_type: "DEPOSIT", amount: 3000, created_at: "2026-09-14T12:00:00Z" }, { id: "entry", entry_type: "ENTRY_DEBIT", amount: -500, created_at: "2026-09-14T13:00:00Z" }] }} />);
  expect(screen.getByRole("heading", { name: "Playable Wallet" })).toBeTruthy();
  expect(screen.getByAltText("Zero Loss leather wallet")).toBeTruthy();
  expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Entry purchase")).toBeTruthy();
});

test("enabled preview wallet puts Add Card beside Add funds", () => {
  render(<WalletOverview wallet={{ ...empty, walletAccountId: "wallet-a", scope: "demo", fundingAvailable: true }} fundingEnabled requests={[]} requestKey="stable_demo_request_001" />);
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe("#add-funds");
  expect(screen.getByRole("link", { name: "Add Card" }).getAttribute("href")).toBe("/account/wallet?view=card");
  expect(screen.getByRole("link", { name: "View payment methods" }).getAttribute("href")).toBe("/account/wallet?view=card");
});

test("wallet tickets reuse real account counts and direct destinations", () => {
  render(<WalletOverview wallet={empty} activity={storedActivityFixture()} requests={[]} />);
  expect(screen.getByRole("link", { name: "Playable Wallet: $0.00" }).getAttribute("href")).toBe("/account/wallet?view=history#balance");
  expect(screen.getByRole("link", { name: "Prize Ready: 1" }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv");
  expect(screen.getByRole("link", { name: "Purchase Options: 2" }).getAttribute("href")).toBe("/account/entries?filter=completion");
});

test("funding from a prize has a direct return to its entry controls", () => {
  render(<WalletOverview wallet={empty} returnToProduct={{ title: "Samsung TV", href: "/items/samsung-m70h-tv#enter-entry" }} />);
  expect(screen.getByText("Samsung TV")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to this prize" }).getAttribute("href")).toBe("/items/samsung-m70h-tv#enter-entry");
});

test("ordinary wallet visits do not invent a previous prize", () => {
  render(<WalletOverview wallet={empty} />);
  expect(screen.queryByRole("link", { name: "Back to this prize" })).toBeNull();
});
