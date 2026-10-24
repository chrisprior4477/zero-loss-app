import { expect, test } from "vitest";
import { groupedOpenEntries, groupedActivityUpdates, headerCategories, headerCategoryIds, headerCounts, headerDestinations, notificationMessages } from "./header-notifications";
import type { AccountNotification } from "./notifications";
const make = (id: string, tone: AccountNotification["tone"], extra: Partial<AccountNotification> = {}): AccountNotification => ({ id, tone, category: "activity", title: id, body: "", meta: "", href: `/account/entries/${id}`, action: "View", ...extra });
test("routine wallet records and open entries alone do not cover the normal ticket links", () => {
  expect(notificationMessages([make("wallet-hold", "wallet"), make("wallet-debit", "wallet"), make("wallet-release", "wallet"), make("active-1", "active"), make("account-email-confirmed", "account")])).toEqual([]);
});
test("open entries stay in the dropdown but never rotate, even alongside support", () => {
  expect(notificationMessages([make("active-1", "active"), make("support-case", "account"), make("wallet-debit", "wallet")])).toEqual([
    { label: "Support", count: 1, color: "purple", category:"support" },
  ]);
  expect(headerCounts([make("active-1","active")]).entries).toBe(1);
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
test("exactly five categories exclude purchased cards and completed purchases", () => {
  expect(headerCategories.map(c=>c.label)).toEqual(["You won","Purchase options","See open entries","Support","Shared picks"]);
  expect(notificationMessages([make("reward-paid", "reward", { rewardSource: "purchase" }),make("order-one","order")])).toEqual([]);
  expect(headerDestinations).toEqual({ wins:"/account/entries?filter=prize#my-activity-filters", options:"/account/entries?filter=completion#my-activity-filters", entries:"/account/entries?filter=active#my-activity-filters" });
});
test("clearing wins leaves options, support, and shared picks available in the banner", () => {
 const items=[make("win","reward"),make("option","completion"),make("support-one","account"),make("shared-one","crew")];
 const ids=headerCategoryIds(items,"wins");
 expect(notificationMessages(items.filter(n=>!ids.includes(n.id))).map(m=>m.category)).toEqual(["options","support","shared"]);
});
test("win cards group products and deduplicate deadline alerts", () => {
 const a=make("reward-1","reward",{itemTitle:"TV",itemSlug:"tv",entryId:"one",image:"/tv.png"});
 const deadline=make("deadline-1","reward",{...a,id:"deadline-1"});
 const b=make("reward-2","reward",{itemTitle:"TV",itemSlug:"tv",entryId:"two"});
 expect(groupedActivityUpdates([a,b,deadline],[a,b,deadline],"wins")).toEqual([expect.objectContaining({title:"TV",count:2,image:"/tv.png",href:expect.stringContaining("filter=prize&viewed=one")})]);
});
test("the same gift card across different offerings shows one total without changing its records", () => {
  const a=make("active-1","active",{itemSlug:"publix-100",itemTitle:"$100 Publix Gift Card",visualLabel:"Publix"});
  const b=make("active-2","active",{itemSlug:"publix-100-ending-soon",itemTitle:a.itemTitle,visualLabel:"Publix"});
  expect(groupedOpenEntries([a,b],[a,b])).toEqual([expect.objectContaining({title:a.itemTitle,count:2})]);
  expect(headerCategoryIds([a,b],"entries")).toEqual([a.id,b.id]);
});
