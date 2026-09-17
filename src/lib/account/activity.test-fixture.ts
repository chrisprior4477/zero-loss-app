import { getDemoProduct } from "@/lib/catalog/demo-products";
import type { AccountActivity, ActivityStatus } from "./activity";

const examples = [
  ["playstation-5-slim", "active"],
  ["samsung-m70h-tv", "prize"],
  ["nike-court-shot-shoes", "completion"],
  ["babys-essentials-bundle", "completion"],
] as const satisfies readonly (readonly [string, ActivityStatus])[];

/** Test-only stored activity. Runtime customer readers never import this file. */
export function storedActivityFixture(): AccountActivity {
  const activity = examples.map(([slug, status]) => {
    const product = getDemoProduct(slug);
    if (!product) throw new Error(`Missing test catalog product: ${slug}`);
    return {
      slug, status, title: product.title, retailer: product.retailer,
      image: product.gallery[0].src, rewardKind: "digital" as const,
      priceCents: Math.round(product.value * 100),
      paidCents: Math.round(product.entryPrice * 100),
      remainingCents: Math.round((product.value - product.entryPrice) * 100),
      availability: "Stored test activity",
    };
  });
  return {
    isPreview: false,
    activity,
    activeCount: activity.filter(item => item.status === "active").length,
    source: "stored",
  };
}
