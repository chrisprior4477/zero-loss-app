import type { AvailabilitySnapshot } from "@/lib/catalog/availability";
import type { ActivityItem } from "./activity";

export type ActivityOfferMetrics = { percentFilled: number; sold: number; capacity: number; remaining: number };

/** Show activity progress only when the current database availability was verified. */
export function activityOfferMetrics(items: ActivityItem[], availability: AvailabilitySnapshot | null): Record<string, ActivityOfferMetrics> {
  const metrics: Record<string, ActivityOfferMetrics> = {};
  for (const item of items) {
    if (item.status !== "active") continue;
    const offering = availability?.[item.slug];
    if (!offering || offering.capacity <= 0) continue;
    metrics[item.slug] = {
      percentFilled: Math.floor(offering.sold / offering.capacity * 100),
      sold: offering.sold,
      capacity: offering.capacity,
      remaining: offering.remaining,
    };
  }
  return metrics;
}

export function activityOfferProgress(items: ActivityItem[], availability: AvailabilitySnapshot | null): Record<string, number> {
  return Object.fromEntries(Object.entries(activityOfferMetrics(items, availability)).map(([slug, value]) => [slug, value.percentFilled]));
}
