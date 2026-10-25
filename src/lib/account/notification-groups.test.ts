import { expect, test } from "vitest";
import { groupNotifications } from "./notification-groups";
import type { AccountNotification } from "./notifications";

function entry(id: string, overrides: Partial<AccountNotification> = {}): AccountNotification {
  return { id, entryId: id, itemSlug: "bundle", itemTitle: "Bundle", title: "Bundle is still open", body: "Your $1 entry is still active.", meta: "Entry recorded", href: `/account/entries/${id}`, action: "See My Entry", category: "activity", tone: "active", ...overrides };
}

test("stacks repeated open entries by product and preserves every exact record and its order", () => {
  const first = entry("one");
  const second = entry("two");
  const other = entry("other", { itemSlug: "another-bundle" });
  const source = Object.freeze([Object.freeze(first), Object.freeze(other), Object.freeze(second)]);
  const groups = groupNotifications(source);
  expect(groups.map(group => group.notifications.map(item => item.id))).toEqual([["one", "two"], ["other"]]);
  expect(groups[0].notifications).toEqual([first, second]);
  expect(groups[0].notifications.map(item => item.href)).toEqual(["/account/entries/one", "/account/entries/two"]);
  expect(source).toEqual([first, other, second]);
});

test("rewards, purchase actions, orders, transactions and incomplete identities remain separate", () => {
  const source = [
    entry("open"), entry("reward", { tone: "reward" }),
    entry("purchase", { category: "action", tone: "completion" }),
    entry("order", { category: "orders", tone: "order" }),
    entry("transaction", { tone: "wallet" }),
    entry("request", { crewRequestId: "crew-id" }),
    entry("no-product", { itemSlug: undefined }),
    entry("no-entry", { entryId: undefined }),
  ];
  expect(groupNotifications(source).map(group => group.notifications)).toEqual(source.map(item => [item]));
});

test("an empty feed has no invented groups", () => {
  expect(groupNotifications([])).toEqual([]);
});
