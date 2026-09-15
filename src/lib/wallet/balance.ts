import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  formatUsdFromCents,
  type PlayableBalanceCents,
} from "@/lib/wallet/money";
import { parseWalletSnapshot } from "@/lib/wallet/snapshot";

import type { LedgerEntryRow } from "@/lib/wallet/snapshot";
export type { LedgerEntryRow } from "@/lib/wallet/snapshot";

/**
 * Request-scoped cache: header, drawer and wallet share one database snapshot.
 * PostgreSQL determines the wallet identity and sums ALL rows, independent of
 * Data API pagination. No client-controlled scope or cached dollar balance.
 */
export const getWalletSnapshot = cache(async (authUserId: string) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== authUserId) {
    throw new Error("Wallet authentication required");
  }
  const { data, error } = await supabase.rpc("get_wallet_snapshot");
  if (error) throw new Error("Wallet balance is temporarily unavailable");
  return parseWalletSnapshot(data);
});

export async function getPlayableBalanceCents(
  authUserId: string
): Promise<PlayableBalanceCents> {
  return (await getWalletSnapshot(authUserId)).balanceCents;
}

export async function getPlayableBalanceLabel(
  authUserId: string
): Promise<string> {
  const cents = await getPlayableBalanceCents(authUserId);
  return formatUsdFromCents(cents);
}

/** Latest 50 entries from the same database snapshot as the balance. */
export async function getLedgerEntriesForCustomer(
  authUserId: string
): Promise<LedgerEntryRow[]> {
  return (await getWalletSnapshot(authUserId)).entries;
}
