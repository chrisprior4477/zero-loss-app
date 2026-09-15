import "server-only";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import type { AccountActivity } from "./activity";

// Presentation fixtures only: there is no write path from here to the ledger.
const examples = [
  ["playstation-5-slim", "active"],
  ["nike-court-shot-shoes", "prize"],
  ["babys-essentials-bundle", "completion"],
  ["samsung-m70h-tv", "completion"],
] as const;

// Called ONLY by the server account reader, after session/allowlist verification.
// URLs and browser state cannot select fixtures. No monetary balance lives here.
export function drawerState(previewAuthorized: boolean, hasEmptySnapshot: boolean): AccountActivity {
  const isPreview = previewAuthorized;
  const activity = isPreview ? examples.map(([slug, status]) => {
    const product = getDemoProduct(slug);
    if (!product) throw new Error(`Missing preview catalog product: ${slug}`);
    return { slug, status, title: product.title, retailer: product.retailer,
      image: product.gallery[0].src, rewardKind: "digital" as const,
      priceCents: Math.round(product.value * 100), paidCents: Math.round(product.entryPrice * 100),
      remainingCents: Math.round((product.value - product.entryPrice) * 100),
      availability: "Not checked — demonstration only" };
  }) : [];
  return {
    isPreview,
    activity,
    // Checkpoint one has no entry-purchase/AMOE records or entry writer yet.
    // Do not invent an entry count from a non-empty or failed wallet snapshot.
    activeCount: isPreview ? activity.filter(item => item.status === "active").length : hasEmptySnapshot ? 0 : null,
    source: isPreview ? "illustrative-fixtures" : hasEmptySnapshot ? "checkpoint-one-empty" : "unavailable",
  } as const;
}
