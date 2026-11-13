import { activityHref, isWalletReward, type ActivityItem } from "@/lib/account/activity";
import type { LedgerEntryRow } from "./snapshot";

export function ledgerDescription(entryType: string, productTitle?: string) {
  if (entryType === "ENTRY_HOLD") return ["Entry reservation", productTitle ?? "Held during the 30-second Undo window"];
  if (entryType === "ENTRY_HOLD_RELEASE") return ["Entry reservation released", productTitle ?? "Hold released on Undo or replaced by the confirmed entry purchase"];
  if (entryType === "ENTRY_DEBIT") return ["Entry purchase", productTitle ?? "Product entry"];
  if (entryType === "PURCHASE_DEBIT") return ["Gift-card purchase", productTitle ?? "Completed purchase option"];
  return ({ DEPOSIT: ["Funds added", "Playable wallet funding"], REFUND: ["Refund", "Returned to playable wallet"], CORRECTION: ["Adjustment", "Wallet correction"] } as Record<string, [string, string]>)[entryType] ?? ["Wallet transaction", "Posted ledger activity"];
}

/** Only link records present in the signed-in customer's authorized activity. */
export function transactionLinks(entry: LedgerEntryRow, activity: readonly ActivityItem[]) {
  const reservation = entry.entry_type === "ENTRY_HOLD" || entry.entry_type === "ENTRY_HOLD_RELEASE";
  const byId = new Map(activity.filter(item => item.entryId).map(item => [item.entryId!, item]));
  return [...new Set(entry.entryIds ?? [])].flatMap(id => {
    const item = byId.get(id);
    // A temporary hold can reference an entry that later produced a reward.
    // Only the actual entry or purchase debit should link to that gift card.
    if (!item || (reservation && isWalletReward(item))) return [];
    const href = item.status === "active"
      ? `${activityHref(item)}?entries=open#saved-entry-rail`
      : item.status === "completion" && item.completionOptionStatus !== "declined"
      ? `/account/purchase-options/${encodeURIComponent(item.slug)}?option=${encodeURIComponent(id)}#purchase-option-rail`
      : activityHref(item);
    return [{ id, href, label: item.status === "active" ? "View entry" : item.completionOptionStatus === "declined" ? "Review declined offer" : item.status === "completion" ? "View purchase option" : "View result" }];
  });
}
