import { openEntriesHref } from "./activity";
import type { AccountNotification } from "./notifications";
export type BannerMessage = { label: string; count: number; color: "green" | "orange" | "blue" | "purple" | "teal"; category?: HeaderCategory };
export type HeaderCategory = "wins" | "options" | "entries" | "support" | "shared" | "saved";
export const headerDestinations = {
  wins: "/account/entries?filter=prize#my-activity-filters",
  options: "/account/entries?filter=completion#my-activity-filters",
  entries: openEntriesHref,
} as const;
export const headerCategories: { key: HeaderCategory; label: string; color: BannerMessage["color"] }[] = [
  { key: "wins", label: "You won", color: "green" },
  { key: "options", label: "Purchase options", color: "orange" },
  { key: "entries", label: "See open entries", color: "blue" },
  { key: "shared", label: "Shared with You", color: "blue" },
  { key: "support", label: "Support tickets", color: "purple" },
  { key: "saved", label: "Saved items", color: "teal" },
];
export function headerCategory(n: AccountNotification): HeaderCategory | null {
  if (n.id.startsWith("support-")) return "support";
  if (n.id.startsWith("shared-") || n.crewRequestId) return "shared";
  // Wallet bookkeeping belongs to transaction history, not the header inbox.
  if (n.tone === "wallet" || n.tone === "account") return null;
  if (n.rewardSource === "purchase") return null;
  if (n.tone === "reward") return "wins";
  if (n.tone === "completion") return "options";
  if (n.tone === "active") return "entries";
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
  // Open entries remain in the dropdown and ticket link, never in the rotation.
  return headerCategories.filter(c => c.key !== "entries" && c.key !== "saved" && counts[c.key] > 0).map(c => ({ label: c.label === "You won" ? "You won!" : c.label, count: counts[c.key], color: c.color, category: c.key }));
}
export type HeaderEntryGroup = { slug: string; title: string; image?: string; count: number; href: string };
function productKey(n: AccountNotification) {
  // The same gift card can have multiple offerings (for example Ending Soon).
  // Combine their display totals without merging the underlying ticket records.
  return n.itemTitle ? `${n.visualLabel ?? ""}:${n.itemTitle}`.toLowerCase() : n.itemSlug ?? n.id;
}
export function groupedActivityUpdates(all: AccountNotification[], unread: AccountNotification[], category: "wins" | "options" | "entries"): HeaderEntryGroup[] {
  const unreadSlugs = new Set(unread.filter(n => headerCategory(n) === category).map(productKey));
  const groups = new Map<string, HeaderEntryGroup>();
  const seen = new Set<string>();
  for (const n of all) {
    if (headerCategory(n) !== category || seen.has(n.href)) continue;
    seen.add(n.href);
    const slug = productKey(n);
    if (!unreadSlugs.has(slug)) continue;
    const group = groups.get(slug);
    if (group) group.count++;
    else groups.set(slug, { slug, title: n.itemTitle ?? n.title.replace(/ is still open$/, ""), image: n.image, count: 1,
      href: n.entryId ? headerDestinations[category].replace("#", `&viewed=${encodeURIComponent(n.entryId)}#`) : headerDestinations[category] });
  }
  return [...groups.values()];
}
export function groupedOpenEntries(all: AccountNotification[], unread: AccountNotification[]) {
  return groupedActivityUpdates(all, unread, "entries");
}
export function notificationDestination(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return "/account/notifications";
  const url = new URL(href, "https://local.invalid");
  url.searchParams.set("fromUpdates", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
