import { createClient } from "@/lib/supabase/server";
import {
  EMPTY_WALLET_BALANCES,
  type WalletBalances,
} from "@/lib/wallet/money";

type WalletBalanceRow = {
  balance_type: string;
  current_balance: number;
};

/**
 * Reads the customer-facing Wallet projection for the authenticated customer.
 *
 * Balances come from `wallet_balances` (a rebuildable Ledger projection), never
 * from a client-supplied total. Missing projection rows mean empty Ledger
 * history for that bucket and correctly display as zero — rows are created by
 * server-owned ledger posting, not at signup.
 */
export async function getWalletBalancesForCustomer(
  customerUuid: string
): Promise<WalletBalances> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== customerUuid) {
    return EMPTY_WALLET_BALANCES;
  }

  const { data, error } = await supabase
    .from("wallet_balances")
    .select("balance_type, current_balance")
    .eq("customer_id", customerUuid)
    .in("balance_type", ["PLAYABLE", "REBATE"]);

  if (error || !data) {
    // Table may not be applied yet in some environments, or RLS denied.
    // Fail closed to zero rather than inventing or surfacing stale client state.
    return EMPTY_WALLET_BALANCES;
  }

  return projectRows(data);
}

function projectRows(rows: WalletBalanceRow[]): WalletBalances {
  let playableBalanceCents = 0;
  let rebateBalanceCents = 0;

  for (const row of rows) {
    if (!Number.isInteger(row.current_balance)) {
      continue;
    }

    if (row.balance_type === "PLAYABLE") {
      playableBalanceCents = row.current_balance;
    } else if (row.balance_type === "REBATE") {
      rebateBalanceCents = row.current_balance;
    }
  }

  return {
    playableBalanceCents,
    rebateBalanceCents,
    currency: "USD",
  };
}
