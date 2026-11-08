import "server-only";
import { cache } from "react";
import { getAccountContext } from "@/lib/account/context";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { getOfferingAvailability } from "./availability-reader";
import { demoProducts, getDemoProduct } from "./demo-products";
import { resolvedCatalogSlugs } from "./demo-visibility";

/** One request-scoped view for customer discovery. Saved results are read separately. */
export const getShoppingCatalog = cache(async () => {
  const [account, availability] = await Promise.all([getAccountContext(), getOfferingAvailability()]);
  const hidden = new Set(resolvedCatalogSlugs(account?.activity));
  const usesLivePools = isPreviewDataEnvironment() || availability !== null;
  for (const product of demoProducts) {
    const remaining = usesLivePools
      ? availability?.[product.slug]?.remaining ?? 0
      : product.capacity - product.sold;
    if (remaining <= 0) hidden.add(product.slug);
  }
  return { hidden, availability, account, unavailable: usesLivePools && !availability };
});

export async function freeEntryProduct(offering?: string | null) {
  const { hidden } = await getShoppingCatalog();
  const requested = offering ? getDemoProduct(offering) : undefined;
  if (requested) return hidden.has(requested.slug) ? null : requested;
  return demoProducts.find(product => !hidden.has(product.slug)) ?? null;
}
