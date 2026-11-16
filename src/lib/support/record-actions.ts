"use server";

import { getAccountOrders, type AccountOrderStatus } from "@/lib/account/orders";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { getWalletSnapshot } from "@/lib/wallet/balance";
import { parseDemoWalletHistoryVisibility } from "@/lib/wallet/demo-history";
import { ledgerProduct } from "@/lib/wallet/history";
import { ledgerDescription } from "@/lib/wallet/transaction-links";
import { parseSupportRecord, type SupportRecordKind, type SupportRecordPage } from "./records";

const pageSize = 8;
const orderStatus: Record<AccountOrderStatus, string> = {
  payment_confirmed: "Payment confirmed", issuance_pending: "Issuance pending", fulfilled: "Card issued",
  exception: "Action needed", cancelled: "Cancelled", corrected: "Order corrected",
};

export async function loadSupportRecords(kind: SupportRecordKind, page: number): Promise<SupportRecordPage> {
  if (!isPreviewDataEnvironment() || (kind !== "order" && kind !== "transaction")
    || !Number.isSafeInteger(page) || page < 0 || page >= Math.floor(Number.MAX_SAFE_INTEGER / pageSize)) {
    return { error: "These records are unavailable." };
  }
  const offset = page * pageSize;
  try {
    const db = await createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return { error: "Sign in again to choose a record." };
    if (kind === "order") {
      const { orders } = await getAccountOrders(db);
      const records = orders.slice(offset, offset + pageSize).flatMap(order => {
        const record = parseSupportRecord({ kind, id: order.orderNumber, title: order.title, detail: order.retailer,
          amount: order.amountPaidCents, date: order.createdAt, status: orderStatus[order.status] });
        return record ? [record] : [];
      });
      return { records, more: orders.length > offset + pageSize };
    }

    const wallet = await getWalletSnapshot(user.id);
    if (wallet.scope !== "demo") return { records: [], more: false };
    const [history, visibility] = await Promise.all([
      db.from("ledger_entries").select("id,entry_type,amount,created_at,source_event,related_pool_id")
        .eq("customer_id", user.id).order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(offset, offset + pageSize),
      db.rpc("get_demo_wallet_history_visibility"),
    ]);
    if (history.error || visibility.error) throw new Error("Wallet history unavailable");
    const hidden = new Set(parseDemoWalletHistoryVisibility(visibility.data).ledgerEntryIds);
    const rows = history.data ?? [];
    const records = rows.slice(0, pageSize).flatMap(row => {
      if (hidden.has(row.id)) return [];
      const [label, detail] = ledgerDescription(row.entry_type);
      const product = ledgerProduct(row, new Map(), new Map());
      const record = parseSupportRecord({ kind, id: row.id, title: product?.title ?? label,
        detail: product ? label : detail, amount: row.amount, date: row.created_at, status: "Posted" });
      return record ? [record] : [];
    });
    return { records, more: rows.length > pageSize };
  } catch {
    return { error: "We couldn’t load these records. Try again, or send your request without an attachment." };
  }
}
