import type { AccountNotification, NotificationCategory } from "./notifications";

export type NotificationFilter = "all" | NotificationCategory;
export function notificationFilter(value: unknown): NotificationFilter {
  return value === "action" || value === "account" || value === "activity" || value === "orders" || value === "crew" ? value : "all";
}

export function validNotice(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_:-]{1,160}$/.test(value);
}

export function notificationHref(filter: NotificationFilter, notice?: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (validNotice(notice)) params.set("notice", notice);
  return `/account/notifications${params.size ? `?${params}#notification-tickets-filters` : ""}`;
}

export function notificationDestination(item: AccountNotification, filter: NotificationFilter) {
  if (!item.href.startsWith("/account/orders?order=") && !item.href.startsWith("/account/wallet?reward=")
    && !/^\/account\/wallet\?(?:[^#]*&)?transaction=/.test(item.href)
    && !/^\/support(?:[?#]|$)/.test(item.href)
    && !/^\/account\/purchase-options\/[a-z0-9-]+\?option=/.test(item.href)
    && !/^\/account\/entries\/ent_[a-f0-9]{32}(?:[?#]|$)/i.test(item.href)) return item.href;
  const [path, hash] = item.href.split("#", 2);
  const url = new URL(path, "https://navigation.invalid");
  url.searchParams.set("alerts", filter);
  if (validNotice(item.id)) url.searchParams.set("notice", item.id);
  return `${url.pathname}${url.search}${hash ? `#${hash}` : ""}`;
}
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
