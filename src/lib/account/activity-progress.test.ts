import { expect, test } from "vitest";
import type { AvailabilitySnapshot } from "@/lib/catalog/availability";
import { storedActivityFixture } from "./activity.test-fixture";
import { activityOfferProgress } from "./activity-progress";

test("each still-open ticket uses its own current sold-to-capacity percentage", () => {
  const items = storedActivityFixture().activity;
  items.push({ ...items[0], slug: "another-open-offer", title: "Another open offer" });
  const availability: AvailabilitySnapshot = {
    "playstation-5-slim": { slug: "playstation-5-slim", capacity: 200, sold: 73, remaining: 127, entryPriceCents: 100, repeatableScenario: false },
    "another-open-offer": { slug: "another-open-offer", capacity: 80, sold: 60, remaining: 20, entryPriceCents: 100, repeatableScenario: false },
    "samsung-m70h-tv": { slug: "samsung-m70h-tv", capacity: 100, sold: 99, remaining: 1, entryPriceCents: 100, repeatableScenario: false },
  };

  expect(activityOfferProgress(items, availability)).toEqual({
    "playstation-5-slim": 36,
    "another-open-offer": 75,
  });
});

test("an unknown offering has no made-up percentage", () => {
  const unknown = { ...storedActivityFixture().activity[0], slug: "unknown-offer" };
  expect(activityOfferProgress([unknown], null)).toEqual({});
});
