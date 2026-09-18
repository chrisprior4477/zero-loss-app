import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountOrderStatus = "payment_confirmed" | "issuance_pending" | "fulfilled" | "exception" | "cancelled" | "corrected";
export type AccountOrder = {
  orderNumber: string;
  rewardSlug: string;
  title: string;
  retailer: string;
  image: string;
  faceValueCents: number;
  amountPaidCents: number;
  status: AccountOrderStatus;
  createdAt: string;
};
export type AccountOrders = { source: "stored" | "customer-empty" | "unavailable"; orders: AccountOrder[] };

const statuses = new Set<AccountOrderStatus>(["payment_confirmed", "issuance_pending", "fulfilled", "exception", "cancelled", "corrected"]);

function cents(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("Invalid order amount");
  return parsed;
}

function parseOrder(value: unknown): AccountOrder {
  if (!value || typeof value !== "object") throw new Error("Invalid order");
  const row = value as Record<string, unknown>;
  if (typeof row.order_number !== "string" || typeof row.reward_slug !== "string"
      || typeof row.title !== "string" || typeof row.retailer !== "string"
      || typeof row.image !== "string" || typeof row.status !== "string" || !statuses.has(row.status as AccountOrderStatus)
      || typeof row.created_at !== "string") throw new Error("Invalid order");
  return {
    orderNumber: row.order_number,
    rewardSlug: row.reward_slug,
    title: row.title,
    retailer: row.retailer,
    image: row.image,
    faceValueCents: cents(row.face_value_cents),
    amountPaidCents: cents(row.amount_paid_cents),
    status: row.status as AccountOrderStatus,
    createdAt: row.created_at,
  };
}

export async function getAccountOrders(db: SupabaseClient): Promise<AccountOrders> {
  const { data, error } = await db.rpc("get_account_orders");
  if (error || !Array.isArray(data)) throw new Error("Orders unavailable");
  const orders = data.map(parseOrder);
  return { source: orders.length ? "stored" : "customer-empty", orders };
}
