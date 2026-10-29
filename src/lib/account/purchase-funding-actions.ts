"use server";

import { completeDemoFunding } from "@/lib/payments/actions";
import { createClient } from "@/lib/supabase/server";
import { parseWalletSnapshot } from "@/lib/wallet/snapshot";

/** Funding stays in the Payments domain; only a fresh ledger projection is returned. */
export async function fundPurchaseWallet(form: FormData) {
  // This journey stays on the purchase page; never accept a client redirect.
  form.delete("returnTo");
  const result = await completeDemoFunding({ status: "idle" }, form);
  if (result.status !== "succeeded" && result.status !== "already_credited") return result;
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) throw new Error("Authentication required");
    const { data, error } = await db.rpc("get_wallet_snapshot");
    if (error) throw error;
    const wallet = parseWalletSnapshot(data);
    return { ...result, balanceCents: wallet.balanceCents };
  } catch {
    return { status: "pending" as const, message: "Your deposit was confirmed, but the updated balance could not be loaded. Check your wallet before adding more funds." };
  }
}
