import type { AccountNotification } from "./notifications";
export type BannerMessage = { label: string; count: number; color: "green" | "orange" | "blue" | "purple" };
export function notificationMessages(notifications: AccountNotification[]): BannerMessage[] {
  const groups: BannerMessage[] = [
    { label: "You won!", count: 0, color: "green" },
    { label: "Purchase options", count: 0, color: "orange" },
    { label: "Shared picks", count: 0, color: "blue" },
    { label: "New updates", count: 0, color: "purple" },
  ];
  for (const n of notifications) {
    const index = n.tone === "reward" ? 0 : n.tone === "completion" ? 1 : n.id.startsWith("shared-") ? 2 : 3;
    groups[index].count++;
  }
  return groups.filter(group => group.count > 0);
}
export function notificationDestination(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return "/account/notifications";
  const url = new URL(href, "https://local.invalid");
  url.searchParams.set("fromUpdates", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
