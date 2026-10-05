import { marketplaceCategories } from "./navigation";

const browseQueryKeys = new Set([
  "category", "sort", "subcategory", "q", "type", "retailer",
  "partnerCategory", "available", "minValue", "maxValue",
]);

/** Product return links may point only to a filtered marketplace page. */
export function productBrowseReturnHref(value: unknown): string {
  if (typeof value !== "string" || value.length > 1000) return "/browse";
  try {
    const url = new URL(value, "https://zeroloss.local");
    if (url.origin !== "https://zeroloss.local" || url.pathname !== "/browse" || url.hash) return "/browse";
    if ([...url.searchParams.keys()].some((key) => !browseQueryKeys.has(key))) return "/browse";
    return `/browse${url.search}`;
  } catch {
    return "/browse";
  }
}

export function productHrefWithBrowseReturn(slug: string, browseHref: string): string {
  return `/items/${slug}?from=${encodeURIComponent(productBrowseReturnHref(browseHref))}`;
}

export function productBrowseReturnLabel(href: string): string {
  const url = new URL(productBrowseReturnHref(href), "https://zeroloss.local");
  const category = marketplaceCategories.find((item) => item.id === url.searchParams.get("category"));
  if (category) return category.label;
  if (url.searchParams.get("sort") === "ending-soon") return "Ending Soon";
  if (url.searchParams.has("q")) return "Search results";
  return "marketplace";
}
