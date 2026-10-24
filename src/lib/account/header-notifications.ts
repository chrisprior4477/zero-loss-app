import { openEntriesHref } from "./activity";
import type { AccountNotification } from "./notifications";
export type BannerMessage = { label: string; count: number; color: "green" | "orange" | "blue" | "purple"; category?: HeaderCategory };
export type HeaderCategory = "wins" | "purchases" | "options" | "entries" | "support" | "shared";
export const headerDestinations = {
  wins: "/account/entries?filter=prize#my-activity-filters",
  purchases: "/account/entries?filter=completed#my-activity-filters",
  options: "/account/entries?filter=completion#my-activity-filters",
  entries: openEntriesHref,
} as const;
export const headerCategories: { key: HeaderCategory; label: string; color: BannerMessage["color"] }[] = [
  { key: "wins", label: "You won", color: "green" },
  { key: "purchases", label: "Purchase", color: "orange" },
  { key: "options", label: "Purchase options", color: "orange" },
  { key: "entries", label: "See open entries", color: "blue" },
  { key: "support", label: "Support", color: "purple" },
  { key: "shared", label: "Shared picks", color: "blue" },
];
export function headerCategory(n: AccountNotification): HeaderCategory | null {
  if (n.id.startsWith("support-")) return "support";
  if (n.id.startsWith("shared-") || n.crewRequestId) return "shared";
  // Wallet bookkeeping belongs to transaction history, not the header inbox.
  if (n.tone === "wallet" || n.tone === "account") return null;
  if (n.rewardSource === "purchase") return "purchases";
  if (n.tone === "reward") return "wins";
  if (n.tone === "completion") return "options";
  if (n.tone === "active") return "entries";
  if (n.tone === "order") return "purchases";
  return null;
}
function distinctCount(items: AccountNotification[]) {
  // A reward and its deadline are one reward, not two wins.
  return new Set(items.map(n => n.href)).size;
}
export function headerCategoryIds(items: AccountNotification[], category: HeaderCategory) {
  return items.filter(n => headerCategory(n) === category || (category === "entries" && n.ledgerEntryType?.startsWith("ENTRY_"))).map(n => n.id);
}
export function headerCounts(items: AccountNotification[]) {
  return Object.fromEntries(headerCategories.map(({ key }) => [key, distinctCount(items.filter(n => headerCategory(n) === key))])) as Record<HeaderCategory, number>;
}
export function notificationMessages(notifications: AccountNotification[]): BannerMessage[] {
  const counts = headerCounts(notifications);
  // Open entries remain available from the ticket link. They never keep the
  // alert overlay running alone after wins/options and other updates are read.
  if (!headerCategories.some(c => c.key !== "entries" && counts[c.key])) return [];
  return headerCategories.filter(c => counts[c.key] > 0).map(c => ({ label: c.label === "You won" ? "You won!" : c.label, count: counts[c.key], color: c.color, category: c.key }));
}
export type HeaderEntryGroup = { slug: string; title: string; image?: string; count: number; href: string };
export function groupedOpenEntries(all: AccountNotification[], unread: AccountNotification[]): HeaderEntryGroup[] {
  const unreadSlugs = new Set(unread.filter(n => n.tone === "active").map(n => n.itemSlug ?? n.id));
  const groups = new Map<string, HeaderEntryGroup>();
  for (const n of all) {
    if (n.tone !== "active") continue;
    const slug = n.itemSlug ?? n.id;
    if (!unreadSlugs.has(slug)) continue;
    const group = groups.get(slug);
    if (group) group.count++;
    else groups.set(slug, { slug, title: n.itemTitle ?? n.title.replace(/ is still open$/, ""), image: n.image, count: 1,
      href: n.entryId ? `/account/entries?filter=active&viewed=${encodeURIComponent(n.entryId)}#my-activity-filters` : openEntriesHref });
  }
  return [...groups.values()];
}
export function notificationDestination(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return "/account/notifications";
  const url = new URL(href, "https://local.invalid");
  url.searchParams.set("fromUpdates", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
