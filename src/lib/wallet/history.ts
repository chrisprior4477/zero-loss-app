import { createClient } from "@/lib/supabase/server";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import type { LedgerEntryRow, WalletSnapshot } from "./snapshot";

type LedgerSourceRow = LedgerEntryRow & { source_event: string; related_pool_id: string | null };
const requestEvent = /^entry_request_([0-9a-f-]{36})_ENTRY_HOLD(?:_RELEASE)?$/i;

function product(slug: string | undefined) {
  const item = slug ? getDemoProduct(slug) : undefined;
  return item?.gallery[0] ? { title: item.title, image: item.gallery[0].src } : undefined;
}

/** Only use identities recorded on the ledger or their owner-scoped records. */
export function ledgerProduct(
  row: LedgerSourceRow,
  requests: Map<string, string>,
  purchases: Map<string, string>,
) {
  if (row.entry_type === "ENTRY_DEBIT" && row.related_pool_id?.startsWith("preview_")) {
    return product(row.related_pool_id.slice("preview_".length));
  }
  if (row.entry_type === "ENTRY_HOLD" || row.entry_type === "ENTRY_HOLD_RELEASE") {
    const id = requestEvent.exec(row.source_event)?.[1];
    return product(id ? requests.get(id) : undefined);
  }
  if (row.entry_type === "PURCHASE_DEBIT") return product(purchases.get(row.source_event));
  return undefined;
}

/** Read the complete owner-scoped history in Data API-sized pages. The wallet
 * snapshot remains authoritative for balance and count. */
export async function getCompleteLedgerHistory(userId: string, wallet: WalletSnapshot | null): Promise<LedgerEntryRow[] | null> {
  if (!wallet || wallet.transactionCount === 0) return wallet?.entries ?? null;
  const db = await createClient();
  const rows: LedgerSourceRow[] = [];
  for (let offset = 0; offset < wallet.transactionCount; offset += 500) {
    const { data, error } = await db.from("ledger_entries").select("id,entry_type,amount,created_at,source_event,related_pool_id")
      .eq("customer_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, Math.min(offset + 499, wallet.transactionCount - 1));
    if (error || !data || data.length === 0) return null;
    for (const row of data) {
      if (typeof row.id !== "string" || typeof row.entry_type !== "string" || !Number.isSafeInteger(row.amount)
        || row.amount === 0 || typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at))
        || typeof row.source_event !== "string" || (row.related_pool_id !== null && typeof row.related_pool_id !== "string")) return null;
      rows.push(row);
    }
  }
  if (rows.length !== wallet.transactionCount || wallet.entries.some((entry, index) => entry.id !== rows[index]?.id)) return null;

  const requestIds = [...new Set(rows.flatMap(row => {
    if (row.entry_type !== "ENTRY_HOLD" && row.entry_type !== "ENTRY_HOLD_RELEASE") return [];
    const id = requestEvent.exec(row.source_event)?.[1];
    return id ? [id] : [];
  }))];
  const requestSlugs = new Map<string, string>();
  for (let index = 0; index < requestIds.length; index += 100) {
    const { data, error } = await db.from("entry_requests").select("id,offering_slug")
      .eq("customer_id", userId).in("id", requestIds.slice(index, index + 100));
    if (!error) for (const request of data ?? []) requestSlugs.set(request.id, request.offering_slug);
  }

  const purchaseEvents = [...new Set(rows.filter(row => row.entry_type === "PURCHASE_DEBIT").map(row => row.source_event))];
  const purchaseSlugs = new Map<string, string>();
  for (let index = 0; index < purchaseEvents.length; index += 100) {
    const { data: orders, error } = await db.from("customer_orders").select("provider_event_id,completion_option_id")
      .eq("customer_id", userId).in("provider_event_id", purchaseEvents.slice(index, index + 100));
    if (error || !orders?.length) continue;
    const optionIds = orders.map(order => order.completion_option_id).filter((id): id is string => typeof id === "string");
    if (!optionIds.length) continue;
    const { data: options, error: optionError } = await db.from("completion_options").select("id,customer_entry_id")
      .eq("customer_id", userId).in("id", optionIds);
    if (optionError || !options?.length) continue;
    const { data: entries, error: entryError } = await db.from("customer_entries").select("id,offering_slug")
      .eq("customer_id", userId).in("id", options.map(option => option.customer_entry_id));
    if (entryError || !entries?.length) continue;
    const entrySlugs = new Map(entries.map(entry => [entry.id, entry.offering_slug]));
    const optionSlugs = new Map(options.map(option => [option.id, entrySlugs.get(option.customer_entry_id)]));
    for (const order of orders) {
      const slug = order.completion_option_id ? optionSlugs.get(order.completion_option_id) : undefined;
      if (slug) purchaseSlugs.set(order.provider_event_id, slug);
    }
  }
  return rows.map(row => {
    const item = ledgerProduct(row, requestSlugs, purchaseSlugs);
    return { id: row.id, entry_type: row.entry_type, amount: row.amount, created_at: row.created_at, ...(item ? { product: item } : {}) };
  });
}
