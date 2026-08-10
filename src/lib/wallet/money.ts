/**
 * Wallet balances are projections of Ledger history only.
 * Amounts are always integer minor units (cents) — never floats.
 */

export type PlayableBalanceCents = number;

/** Format integer cents as a USD display string without floating-point math. */
export function formatUsdFromCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error("formatUsdFromCents requires an integer cent amount");
  }

  const negative = cents < 0;
  const absolute = negative ? -cents : cents;
  const dollars = Math.trunc(absolute / 100);
  const remainder = absolute % 100;
  const sign = negative ? "-" : "";
  if (remainder === 0) {
    return `${sign}$${dollars}`;
  }
  return `${sign}$${dollars}.${remainder.toString().padStart(2, "0")}`;
}

export function sumLedgerAmountsCents(
  amounts: ReadonlyArray<number | null | undefined>
): PlayableBalanceCents {
  let total = 0;
  for (const amount of amounts) {
    if (amount == null) continue;
    if (!Number.isInteger(amount)) {
      throw new Error("Ledger amounts must be integer cents");
    }
    total += amount;
  }
  return total;
}
