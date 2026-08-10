import { createClient } from "@/lib/supabase/server";
import {
  formatUsdFromCents,
  sumLedgerAmountsCents,
  type PlayableBalanceCents,
} from "@/lib/wallet/money";

export type LedgerEntryRow = {
  entry_type: string;
  amount: number;
  created_at: string;
};

/**
 * Derive the customer's PLAYABLE wallet total from ledger_entries.
 * Ledger is authoritative; this is a read-time sum, not a stored balance.
 *
 * ledger_entries.customer_id is uuid → customers.id (auth user id),
 * not the cus_… text identifier.
 */
export async function getPlayableBalanceCents(
  authUserId: string
): Promise<PlayableBalanceCents> {
  const supabase = await createClient();

  const { data: entries, error: ledgerError } = await supabase
    .from("ledger_entries")
    .select("amount")
    .eq("customer_id", authUserId)
    .eq("balance_type", "PLAYABLE");

  if (ledgerError) {
    throw new Error(`Failed to read ledger entries: ${ledgerError.message}`);
  }

  return sumLedgerAmountsCents((entries ?? []).map((row) => row.amount));
}

export async function getPlayableBalanceLabel(
  authUserId: string
): Promise<string> {
  const cents = await getPlayableBalanceCents(authUserId);
  return formatUsdFromCents(cents);
}

/** Customer ledger history, most recent first. */
export async function getLedgerEntriesForCustomer(
  authUserId: string
): Promise<LedgerEntryRow[]> {
  const supabase = await createClient();

  const { data: entries, error: ledgerError } = await supabase
    .from("ledger_entries")
    .select("entry_type, amount, created_at")
    .eq("customer_id", authUserId)
    .order("created_at", { ascending: false });

  if (ledgerError) {
    throw new Error(`Failed to read ledger entries: ${ledgerError.message}`);
  }

  return (entries ?? []).map((row) => ({
    entry_type: row.entry_type,
    amount: row.amount,
    created_at: row.created_at,
  }));
}
