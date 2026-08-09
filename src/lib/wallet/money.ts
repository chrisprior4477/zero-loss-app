export type WalletBalanceType = "PLAYABLE" | "REBATE";

export type WalletBalances = {
  playableBalanceCents: number;
  rebateBalanceCents: number;
  currency: "USD";
};

export const EMPTY_WALLET_BALANCES: WalletBalances = {
  playableBalanceCents: 0,
  rebateBalanceCents: 0,
  currency: "USD",
};

/**
 * Formats minor currency units (cents) for customer-facing display.
 * Product funding presets and copy use USD ($10 / $25 / $50 / $100).
 */
export function formatUsdCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
