import type { AccountNotification } from "./notifications";
import { compareSavedEntries } from "./entry-order";

export type NotificationGroup = {
  key: string;
  notifications: AccountNotification[];
};

/** Group only open entries. Each saved notification and its exact destination stay intact. */
export function groupNotifications(notifications: readonly AccountNotification[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();
  for (const notification of notifications) {
    const canStack = notification.tone === "active" && notification.category === "activity"
      && notification.itemSlug && notification.entryId && !notification.crewRequestId;
    const key = canStack ? `entries:${notification.itemSlug}` : `notification:${notification.id}`;
    const group = groups.get(key);
    if (group) group.notifications.push(notification);
    else groups.set(key, { key, notifications: [notification] });
  }
  return [...groups.values()].map(group => {
    if (group.key.startsWith("entries:")) group.notifications.sort(compareSavedEntries);
    return group;
  });
}
