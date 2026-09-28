import { getDemoProduct } from "@/lib/catalog/demo-products";
import type { AvailabilitySnapshot } from "@/lib/catalog/availability";
import type { ActivityItem } from "./activity";

/** Use the same current-offering data and demo fallback as the product pages. */
export function activityOfferProgress(items: ActivityItem[], availability: AvailabilitySnapshot | null): Record<string, number> {
  const progress: Record<string, number> = {};
  for (const item of items) {
    if (item.status !== "active") continue;
    const offering = availability?.[item.slug] ?? getDemoProduct(item.slug);
    if (!offering || offering.capacity <= 0) continue;
    progress[item.slug] = Math.max(0, Math.min(100, Math.floor(offering.sold / offering.capacity * 100)));
  }
  return progress;
}
