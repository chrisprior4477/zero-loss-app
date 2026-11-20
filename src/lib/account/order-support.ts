import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountOrder } from "./orders";

import { walletTransactionsHref } from "./activity";

export const walletTransactionHelpHref = walletTransactionsHref;

/** Resolve the reverse of the order-to-Support handoff against the customer's visible orders. */
export async function getSupportOrder(db: SupabaseClient, userId: string, purchaseEvent: string, orders: AccountOrder[]) {
  if (!purchaseEvent || !orders.length) return;
  try {
    const { data, error } = await db.from("customer_orders").select("order_number")
      .eq("customer_id", userId).eq("provider_event_id", purchaseEvent).maybeSingle();
    if (!error && data) return orders.find(order => order.orderNumber === data.order_number);
  } catch {
    // An order lookup failure must not prevent reporting the verified charge.
  }
}

/** Match the saved purchase event, never a similar product, amount or date.
 * Both reads use the signed-in customer's client and existing wallet RLS. */
export async function checkOrderSupportTransaction(db: SupabaseClient, userId: string, orderNumber: string): Promise<
  { status: "found"; id: string } | { status: "missing" | "unavailable" }
> {
  try {
    const order = await db.from("customer_orders").select("provider_event_id")
      .eq("customer_id", userId).eq("order_number", orderNumber).maybeSingle();
    if (order.error) return { status: "unavailable" };
    if (typeof order.data?.provider_event_id !== "string" || !order.data.provider_event_id) return { status: "missing" };

    const transaction = await db.from("ledger_entries").select("id")
      .eq("customer_id", userId).eq("source_event", order.data.provider_event_id)
      .eq("entry_type", "PURCHASE_DEBIT").maybeSingle();
    if (transaction.error) return { status: "unavailable" };
    if (typeof transaction.data?.id !== "string"
      || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(transaction.data.id)) return { status: "missing" };

    return { status: "found", id: transaction.data.id };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getOrderSupportTransactionId(db: SupabaseClient, userId: string, orderNumber: string) {
  const result = await checkOrderSupportTransaction(db, userId, orderNumber);
  return result.status === "found" ? result.id : undefined;
}

export async function getOrderSupportHref(db: SupabaseClient, userId: string, orderNumber: string) {
  const id = await getOrderSupportTransactionId(db, userId, orderNumber);
  return id ? `/support?transaction=${encodeURIComponent(id)}#report-problem` : walletTransactionHelpHref;
}
