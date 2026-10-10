import { expect, test } from "vitest";
import { resolvedCatalogSlugs, isResolvedCatalogHref } from "./demo-visibility";
import type { AccountActivity, ActivityItem } from "@/lib/account/activity";

const item = (slug: string, status: ActivityItem["status"]): ActivityItem => ({
  slug, status, title: slug, retailer: "Demo", image: "", rewardKind: "digital",
  priceCents: 100, paidCents: 100, remainingCents: 0, availability: "open",
});

test("only this account's resolved prizes leave the demo catalog until entries are cleared", () => {
  const activity: AccountActivity = {
    source: "stored", isPreview: true, activeCount: 1,
    activity: [item("samsung-m70h-tv", "prize"), item("walmart-100-gift-card", "prize"), item("nike-court-shot-shoes", "completion"),
      item("babys-essentials-bundle", "completed"), item("publix-100-gift-card", "active")],
  };
  const resolved = new Set(resolvedCatalogSlugs(activity));
  expect([...resolved]).toEqual(["samsung-m70h-tv", "walmart-100-gift-card", "nike-court-shot-shoes", "babys-essentials-bundle"]);
  expect(isResolvedCatalogHref("/items/samsung-m70h-tv#enter-entry", resolved)).toBe(true);
  expect(isResolvedCatalogHref("/items/publix-100-gift-card", resolved)).toBe(false);
  expect(resolvedCatalogSlugs({ ...activity, source: "customer-empty", activity: [], activeCount: 0 })).toEqual([]);
  expect(resolvedCatalogSlugs({ ...activity, source: "unavailable" })).toEqual([]);
  expect(resolvedCatalogSlugs(null)).toEqual([]);
});
