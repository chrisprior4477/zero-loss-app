import { marketplaceCategories } from "./navigation";
import { getPopularRewardBrand } from "./popular-rewards";

const browseQueryKeys = new Set([
  "category", "sort", "subcategory", "q", "type", "retailer",
  "partnerCategory", "available", "minValue", "maxValue",
]);

/** Allow only known shopping destinations, including the personal Favorites list. */
export function productBrowseReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1000 || /[\\\s\u0000-\u001f]/.test(value)) return null;
  if (value === "/account/favorites") return value;
  const retailer = /^\/rewards\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  if (retailer) return getPopularRewardBrand(retailer[1]) ? value : null;
  if (!/^\/browse(?:\?|$)/.test(value)) return null;
  try {
    const url = new URL(value, "https://zeroloss.local");
    if (url.origin !== "https://zeroloss.local" || url.pathname !== "/browse" || url.hash) return null;
    const keys = [...url.searchParams.keys()];
    if (keys.some((key) => !browseQueryKeys.has(key)) || new Set(keys).size !== keys.length) return null;
    return value;
  } catch {
    return null;
  }
}

export function productBrowseReturnHref(value: unknown): string {
  return productBrowseReturnPath(value) ?? "/browse";
}

export function productHrefWithBrowseReturn(slug: string, browseHref: string): string {
  return `/items/${slug}?from=${encodeURIComponent(productBrowseReturnHref(browseHref))}`;
}

/** Keep the shopping context through the free-entry instructions and print preview. */
export function freeEntryHref(slug: string, browseReturn: unknown): string {
  const params = new URLSearchParams({ offering: slug });
  const browse = productBrowseReturnPath(browseReturn);
  if (browse) params.set("from", browse);
  return `/free-entry?${params.toString()}`;
}

export function productBrowseReturnLabel(href: string): string {
  const url = new URL(productBrowseReturnHref(href), "https://zeroloss.local");
  if (url.pathname === "/account/favorites") return "Favorites";
  if (url.pathname.startsWith("/rewards/")) {
    const brand = getPopularRewardBrand(url.pathname.slice("/rewards/".length));
    if (brand) return `${brand.name} rewards`;
  }
  const category = marketplaceCategories.find((item) => item.id === url.searchParams.get("category"));
  if (category) return category.label;
  if (url.searchParams.get("sort") === "ending-soon") return "Ending Soon";
  if (url.searchParams.has("q")) return "Search results";
  return "marketplace";
}
