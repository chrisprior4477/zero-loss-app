import "server-only";
import { cache } from "react";
import { getAccountContext } from "@/lib/account/context";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { getOfferingAvailabilityReport } from "./availability-reader";
import { demoProducts, getDemoProduct } from "./demo-products";
import { getSharedProductContext } from "@/lib/sharing/receiving-reader";
import { shareUuid } from "@/lib/sharing/saved-shares";
import { resolvedCatalogSlugs } from "./demo-visibility";

/** One request-scoped view for customer discovery. Saved results are read separately. */
export const getShoppingCatalog = cache(async () => {
  const [accountResult, report] = await Promise.all([getAccountContext("report"), getOfferingAvailabilityReport()]);
  const account = accountResult === "unavailable" ? null : accountResult;
  const availability = report.snapshot;
  const hidden = new Set(resolvedCatalogSlugs(account?.activity));
  const usesLivePools = isPreviewDataEnvironment() || availability !== null;
  for (const product of demoProducts) {
    const remaining = usesLivePools
      ? availability?.[product.slug]?.remaining ?? 0
      : product.capacity - product.sold;
    if (remaining <= 0) hidden.add(product.slug);
  }
  return { hidden, availability, account, accountUnavailable: accountResult === "unavailable", unavailable: usesLivePools && !availability,
    unverifiedSlugs: report.unverifiedSlugs, availabilityIncomplete: report.incomplete };
});

export async function freeEntryChoices(offerings: string[], share: unknown) {
  const products = await Promise.all([...new Set(offerings.map(slug => slug.toLowerCase()))].slice(0, 12).map(freeEntryProduct));
  const token = typeof share === "string" && shareUuid.test(share) ? share : undefined;
  return Promise.all(products.filter(product => product != null).map(async product => {
    const context = token ? await getSharedProductContext(product.slug, token, false).catch(() => null) : null;
    return { product, share: context?.slug === product.slug && context?.token.toLowerCase() === token?.toLowerCase() ? token : undefined };
  }));
}

export async function freeEntryProduct(offering?: string | null) {
  const { hidden, account, unavailable, unverifiedSlugs } = await getShoppingCatalog();
  const requested = offering ? getDemoProduct(offering.toLowerCase()) : undefined;
  if (offering && !requested) return null;
  if ((unavailable || requested && unverifiedSlugs.has(requested.slug)) && (!requested || !resolvedCatalogSlugs(account?.activity).includes(requested.slug))) return undefined;
  if (requested) return hidden.has(requested.slug) ? null : requested;
  return demoProducts.find(product => !hidden.has(product.slug)) ?? null;
}
