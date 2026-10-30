import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const walletTransactionHelpHref = "/account/wallet?view=history#transactions";

/** Match the saved purchase event, never a similar product, amount or date.
 * Both reads use the signed-in customer's client and existing wallet RLS. */
export async function getOrderSupportHref(db: SupabaseClient, userId: string, orderNumber: string) {
  try {
    const order = await db.from("customer_orders").select("provider_event_id")
      .eq("customer_id", userId).eq("order_number", orderNumber).maybeSingle();
    if (order.error || typeof order.data?.provider_event_id !== "string" || !order.data.provider_event_id) return walletTransactionHelpHref;

    const transaction = await db.from("ledger_entries").select("id")
      .eq("customer_id", userId).eq("source_event", order.data.provider_event_id)
      .eq("entry_type", "PURCHASE_DEBIT").maybeSingle();
    if (transaction.error || typeof transaction.data?.id !== "string"
      || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(transaction.data.id)) return walletTransactionHelpHref;

    return `/support?transaction=${encodeURIComponent(transaction.data.id)}#report-problem`;
  } catch {
    // A missing payment must not block Orders or attach an unrelated charge.
    return walletTransactionHelpHref;
  }
}
