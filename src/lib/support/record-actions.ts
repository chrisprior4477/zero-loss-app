"use server";

import { checkOrderSupportTransaction } from "@/lib/account/order-support";
import { getAccountOrders, type AccountOrderStatus } from "@/lib/account/orders";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { getWalletSnapshot } from "@/lib/wallet/balance";
import { parseDemoWalletHistoryVisibility } from "@/lib/wallet/demo-history";
import { getCompleteLedgerHistory } from "@/lib/wallet/history";
import { ledgerDescription } from "@/lib/wallet/transaction-links";
import { parseSupportRecord, type SupportRecordKind, type SupportRecordPage } from "./records";

const pageSize = 8;
const orderStatus: Record<AccountOrderStatus, string> = {
  payment_confirmed: "Payment confirmed", issuance_pending: "Issuance pending", fulfilled: "Card issued",
  exception: "Action needed", cancelled: "Cancelled", corrected: "Order corrected",
};

export async function loadSupportRecords(kind: SupportRecordKind, page: number, selectedId?: string): Promise<SupportRecordPage> {
  if (!isPreviewDataEnvironment() || (kind !== "order" && kind !== "transaction")
    || !Number.isSafeInteger(page) || page < 0 || page >= Math.floor(Number.MAX_SAFE_INTEGER / pageSize)) {
    return { error: "These records are unavailable." };
  }
  try {
    const db = await createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return { error: "Sign in again to choose a record." };
    if (kind === "order") {
      const { orders } = await getAccountOrders(db);
      const index = selectedId ? orders.findIndex(order => order.orderNumber === selectedId) : -1;
      if (index >= 0) page = Math.floor(index / pageSize);
      const offset = page * pageSize;
      const records = orders.slice(offset, offset + pageSize).flatMap(order => {
        const record = parseSupportRecord({ kind, id: order.orderNumber, title: order.title, detail: order.retailer,
          amount: order.amountPaidCents, date: order.createdAt, status: orderStatus[order.status] });
        return record ? [record] : [];
      });
      const checks = await Promise.all(records.map(record => checkOrderSupportTransaction(db, user.id, record.id)));
      return { records: records.map((record, index) => ({
        ...record, attachable: checks[index].status === "found", verifyAgain: checks[index].status === "unavailable",
      })), more: orders.length > offset + pageSize, page };
    }

    const wallet = await getWalletSnapshot(user.id);
    if (wallet.scope !== "demo") return { records: [], more: false };
    const [history, visibility] = await Promise.all([
      getCompleteLedgerHistory(user.id, wallet),
      db.rpc("get_demo_wallet_history_visibility"),
    ]);
    if (!history || visibility.error) throw new Error("Wallet history unavailable");
    const hidden = new Set(parseDemoWalletHistoryVisibility(visibility.data).ledgerEntryIds);
    const rows = history.filter(row => !hidden.has(row.id));
    const index = selectedId ? rows.findIndex(row => row.id === selectedId) : -1;
    if (index >= 0) page = Math.floor(index / pageSize);
    const offset = page * pageSize;
    const records = rows.slice(offset, offset + pageSize).flatMap(row => {
      const [label, detail] = ledgerDescription(row.entry_type);
      const product = row.product;
      const record = parseSupportRecord({ kind, id: row.id, title: product?.title ?? label,
        detail: product ? label : detail, amount: row.amount, date: row.created_at, status: "Posted" });
      return record ? [record] : [];
    });
    return { records, more: rows.length > offset + pageSize, page };
  } catch {
    return { error: "We couldn’t load these records. Try again, or send your request without an attachment." };
  }
}
