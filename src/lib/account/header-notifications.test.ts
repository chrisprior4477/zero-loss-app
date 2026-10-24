import { expect, test } from "vitest";
import { groupedOpenEntries, headerCategoryIds, headerCounts, headerDestinations, notificationMessages } from "./header-notifications";
import type { AccountNotification } from "./notifications";
const make = (id: string, tone: AccountNotification["tone"], extra: Partial<AccountNotification> = {}): AccountNotification => ({ id, tone, category: "activity", title: id, body: "", meta: "", href: `/account/entries/${id}`, action: "View", ...extra });
test("routine wallet records and open entries alone do not cover the normal ticket links", () => {
  expect(notificationMessages([make("wallet-hold", "wallet"), make("wallet-debit", "wallet"), make("wallet-release", "wallet"), make("active-1", "active"), make("account-email-confirmed", "account")])).toEqual([]);
});
test("open entries are blue, support is purple, and wallet bookkeeping never inflates the count", () => {
  expect(notificationMessages([make("active-1", "active"), make("support-case", "account"), make("wallet-debit", "wallet")])).toEqual([
    { label: "See open entries", count: 1, color: "blue", category:"entries" }, { label: "Support", count: 1, color: "purple", category:"support" },
  ]);
});
test("all tickets for an unread product are counted, including previously read tickets", () => {
  const a = make("active-1", "active", { itemSlug: "lowes-100", itemTitle: "$100 Lowe's Card", entryId: "one" });
  const b = make("active-2", "active", { itemSlug: a.itemSlug, itemTitle: a.itemTitle, entryId: "two" });
  const c = make("active-3", "active", { itemSlug: "publix-100", itemTitle: "$100 Publix Card" });
  expect(groupedOpenEntries([a,b,c], [b,c])).toEqual([
    expect.objectContaining({ title: "$100 Lowe's Card", count: 2, href: expect.stringContaining("filter=active&viewed=one") }),
    expect.objectContaining({ title: "$100 Publix Card", count: 1 }),
  ]);
  expect(groupedOpenEntries([a,b,c], [])).toEqual([]);
});
test("a win and its deadline count once but both clear on opening the wins category", () => {
  const items = [make("reward-1", "reward", { href: "/account/wallet?rewardId=1" }), make("reward-deadline-1", "reward", { href: "/account/wallet?rewardId=1" }), make("reward-2", "reward", { href: "/account/wallet?rewardId=2" })];
  expect(headerCounts(items).wins).toBe(2);
  expect(headerCategoryIds(items, "wins")).toEqual(items.map(n => n.id));
});
test("opening open entries acknowledges all entry notifications and their bookkeeping together", () => {
  const items = [make("active-1", "active"), make("active-2", "active"), make("wallet-hold", "wallet", { ledgerEntryType: "ENTRY_HOLD" }), make("support-1", "account")];
  expect(headerCategoryIds(items,"entries")).toEqual(["active-1","active-2","wallet-hold"]);
});
test("purchased gift cards are purchases, and each activity category opens its matching view", () => {
  expect(headerCounts([make("reward-paid", "reward", { rewardSource: "purchase" })])).toMatchObject({ purchases:1,wins:0 });
  expect(headerDestinations).toEqual({ wins:"/account/entries?filter=prize#my-activity-filters", purchases:"/account/entries?filter=completed#my-activity-filters", options:"/account/entries?filter=completion#my-activity-filters", entries:"/account/entries?filter=active#my-activity-filters" });
});
