import type { NotificationCategory } from "./notifications";

export type NotificationFilter = "all" | NotificationCategory;
export const notificationReturnKey = "zeroLossNotificationReturn";
export type NotificationReturn = {
  userId: string;
  href: string;
  filter: NotificationFilter;
  start: number;
  size: number;
  expandedGroups: string[];
  scrollY: number;
  listScrollTop: number;
  linkId: string;
  linkTop: number;
};

/** A bookmark belongs to this account and this browser-history entry only. */
export function readNotificationReturn(state: unknown, userId: string, href: string): NotificationReturn | null {
  if (!state || typeof state !== "object") return null;
  const saved = (state as Record<string, unknown>)[notificationReturnKey] as Partial<NotificationReturn> | undefined;
  if (!saved || saved.userId !== userId || saved.href !== href
    || !["all", "action", "account", "activity", "orders", "crew"].includes(saved.filter ?? "")
    || !Number.isSafeInteger(saved.start) || saved.start! < 0
    || !Number.isSafeInteger(saved.size) || saved.size! < 1
    || !Number.isFinite(saved.scrollY) || saved.scrollY! < 0
    || !Number.isFinite(saved.listScrollTop) || saved.listScrollTop! < 0
    || !Number.isFinite(saved.linkTop) || typeof saved.linkId !== "string"
    || !Array.isArray(saved.expandedGroups) || !saved.expandedGroups.every(key => typeof key === "string")) return null;
  return saved as NotificationReturn;
}
