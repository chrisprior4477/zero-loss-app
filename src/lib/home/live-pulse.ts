import { availabilityForHref, availabilityStatus, type AvailabilitySnapshot } from "@/lib/catalog/availability";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { livePulseDemoItems } from "./demo-data";
import type { AccountActivity } from "@/lib/account/activity";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";

export type LivePulseItem = { label: string; value: string; tone: "live" | "danger" | "urgent" | "neutral"; href: string };

/** Built on the server from the same offering snapshot as the homepage cards. */
export function livePulseItems(snapshot: AvailabilitySnapshot | null, activity?: AccountActivity): LivePulseItem[] {
  const resolved = new Set(resolvedCatalogSlugs(activity));
  return livePulseDemoItems.flatMap<LivePulseItem>(item => {
    if (item.format === "stat") return [item];
    const product = getDemoProduct(item.href.slice("/items/".length));
    if (!product || resolved.has(product.slug)) return [];
    const current = availabilityForHref(snapshot, item.href);
    const { remaining, percentFilled } = availabilityStatus(current?.capacity ?? product.capacity, current?.sold ?? product.sold);
    if (remaining === 0) return [];
    const value = item.format === "only" ? `Only ${remaining} left`
        : item.format === "value" ? `$${product.value}`
          : item.format === "percent" ? `${percentFilled}% full`
            : item.format === "entries" ? `${remaining} ${remaining === 1 ? "entry" : "entries"} left`
              : `${remaining} ${remaining === 1 ? "ticket" : "tickets"} left`;
    return [{ label: item.label, href: item.href, tone: item.tone, value }];
  });
}
