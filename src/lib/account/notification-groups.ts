import type { AccountNotification } from "./notifications";
import { compareSavedEntries } from "./entry-order";

export type NotificationGroup = {
  key: string;
  notifications: AccountNotification[];
  purchaseTotalCents?: number;
};

/** Keep each exact destination, grouping wallet debits by their recorded submission. */
export function groupNotifications(notifications: readonly AccountNotification[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();
  for (const notification of notifications) {
    const canStack = notification.tone === "active" && notification.category === "activity"
      && notification.itemSlug && notification.entryId && !notification.crewRequestId;
    const purchase = notification.entryPurchase;
    const purchaseKey = notification.tone === "wallet" && notification.category === "activity"
      && notification.ledgerEntryType === "ENTRY_DEBIT" && purchase?.batchId && notification.itemSlug
      && Number.isSafeInteger(purchase.amountCents) && purchase.amountCents < 0
      ? `entry-purchases:${purchase.batchId}:${notification.itemSlug}` : null;
    const key = purchaseKey ?? (canStack ? `entries:${notification.itemSlug}` : `notification:${notification.id}`);
    const group = groups.get(key);
    if (group) group.notifications.push(notification);
    else groups.set(key, { key, notifications: [notification] });
  }
  return [...groups.values()].flatMap(group => {
    if (group.key.startsWith("entries:")) group.notifications.sort(compareSavedEntries);
    if (!group.key.startsWith("entry-purchases:") || group.notifications.length < 2) return [group];
    const total = group.notifications.reduce((sum, notice) => sum - (notice.entryPurchase?.amountCents ?? 0), 0);
    if (Number.isSafeInteger(total)) return [{ ...group, purchaseTotalCents: total }];
    return group.notifications.map(notice => ({ key: `notification:${notice.id}`, notifications: [notice] }));
  });
}
