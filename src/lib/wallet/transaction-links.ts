import { activityHref, type ActivityItem } from "@/lib/account/activity";
import type { LedgerEntryRow } from "./snapshot";

/** Only link records present in the signed-in customer's authorized activity. */
export function transactionLinks(entry: LedgerEntryRow, activity: readonly ActivityItem[]) {
  const byId = new Map(activity.filter(item => item.entryId).map(item => [item.entryId!, item]));
  return [...new Set(entry.entryIds ?? [])].flatMap(id => {
    const item = byId.get(id);
    if (!item) return [];
    const href = item.status === "active"
      ? `${activityHref(item)}?entries=open#saved-entry-rail`
      : item.status === "completion" && item.completionOptionStatus !== "declined"
      ? `/account/purchase-options/${encodeURIComponent(item.slug)}?option=${encodeURIComponent(id)}#purchase-option-rail`
      : activityHref(item);
    return [{ id, href, label: item.status === "active" ? "View entry" : item.completionOptionStatus === "declined" ? "Review declined offer" : item.status === "completion" ? "View purchase option" : "View result" }];
  });
}
