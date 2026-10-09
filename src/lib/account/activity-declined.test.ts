import { expect, test } from "vitest";
import { activityHref, filterActivity, type ActivityItem } from "./activity";

const base = { slug: "walmart-100-gift-card", title: "Walmart", retailer: "Walmart", image: "/walmart.png",
  rewardKind: "digital" as const, priceCents: 10000, paidCents: 100, remainingCents: 9900, availability: "Declined" };
const declined: ActivityItem = { ...base, entryId: "ent_one", status: "completed", completionOptionStatus: "declined" };
const completed: ActivityItem = { ...base, entryId: "ent_two", status: "completed", completionOptionStatus: "purchased" };
const revived: ActivityItem = { ...declined, status: "completion", completionOptionStatus: "available" };

test("declined offers leave every My Activity filter but keep their account destination", () => {
  expect(filterActivity([declined, completed], "all")).toEqual([completed]);
  expect(filterActivity([declined, completed], "completed")).toEqual([completed]);
  expect(filterActivity([declined], "all")).toEqual([]);
  expect(filterActivity([declined], "completion")).toEqual([]);
  expect(activityHref(declined)).toBe("/account/declined-offers");
});

test("reviving an offer returns it to My Activity and Purchase Options", () => {
  expect(filterActivity([revived], "all")).toEqual([revived]);
  expect(filterActivity([revived], "completion")).toEqual([revived]);
});

test("each active saved entry opens its own page", () => {
  const first: ActivityItem = { ...base, entryId: "ent_11111111111111111111111111111111", status: "active" };
  const second: ActivityItem = { ...first, entryId: "ent_22222222222222222222222222222222" };
  expect(activityHref(first)).toBe("/account/entries/ent_11111111111111111111111111111111");
  expect(activityHref(second)).toBe("/account/entries/ent_22222222222222222222222222222222");
});
