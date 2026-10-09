import { expect, test } from "vitest";
import { activityHref, filterActivity, type ActivityItem } from "./activity";

const base = { slug: "walmart-100-gift-card", title: "Walmart", retailer: "Walmart", image: "/walmart.png",
  rewardKind: "digital" as const, priceCents: 10000, paidCents: 100, remainingCents: 9900, availability: "Declined" };
const declined: ActivityItem = { ...base, entryId: "ent_one", status: "completed", completionOptionStatus: "declined" };
const completed: ActivityItem = { ...base, entryId: "ent_two", status: "completed", completionOptionStatus: "purchased" };

test("declined offers stay in All but not Completed, and open their own account page", () => {
  expect(filterActivity([declined, completed], "all")).toHaveLength(2);
  expect(filterActivity([declined, completed], "completed")).toEqual([completed]);
  expect(activityHref(declined)).toBe("/account/declined-offers");
});
