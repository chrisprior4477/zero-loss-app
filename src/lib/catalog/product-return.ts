import { marketplaceCategories } from "./navigation";
import { getPopularRewardBrand } from "./popular-rewards";
import { savedShareHref, shareUuid } from "../sharing/saved-shares";
import { crewPickReturnPath } from "../crew/view-return";
import { isEntryQuantity } from "../entries/quantity";

const browseQueryKeys = new Set([
  "category", "sort", "subcategory", "q", "type", "retailer",
  "partnerCategory", "available", "minValue", "maxValue", "batch",
]);

/** Allow only known shopping destinations, including the personal Favorites list. */
export function productBrowseReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1000 || /[\\\s\u0000-\u001f]/.test(value)) return null;
  if (value === "/account/favorites") return value;
  const crew = crewPickReturnPath(value);
  if (crew) return crew;
  if (value.startsWith("/account/favorites?")) {
    const url = new URL(value, "https://zeroloss.local");
    const keys = [...url.searchParams.keys()];
    const share = url.searchParams.get("share");
    if (url.hash || url.searchParams.get("tab") !== "shared"
      || keys.some(key => key !== "tab" && key !== "share") || new Set(keys).size !== keys.length
      || (share !== null && !shareUuid.test(share))) return null;
    return savedShareHref(share ?? undefined);
  }
  const retailer = /^\/rewards\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  if (retailer) return getPopularRewardBrand(retailer[1]) ? value : null;
  if (!/^\/browse(?:\?|$)/.test(value)) return null;
  try {
    const url = new URL(value, "https://zeroloss.local");
    if (url.origin !== "https://zeroloss.local" || url.pathname !== "/browse") return null;
    const endingSoon = (url.searchParams.get("category") ?? (url.searchParams.get("sort") === "ending-soon" ? "ending-soon" : "")) === "ending-soon";
    if (url.hash && (!endingSoon || !/^#prize-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.hash))) return null;
    const batch = url.searchParams.get("batch");
    if (batch !== null && (!endingSoon || !/^[1-9]\d*$/.test(batch) || !Number.isSafeInteger(Number(batch)))) return null;
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
export function freeEntryHref(slug: string, browseReturn: unknown, quantity?: number | null): string {
  const params = new URLSearchParams({ offering: slug });
  if (isEntryQuantity(quantity) && quantity > 1) params.set("quantity", String(quantity));
  const browse = productBrowseReturnPath(browseReturn);
  if (browse) params.set("from", browse);
  return `/free-entry?${params.toString()}`;
}

export function productBrowseReturnLabel(href: string): string {
  const url = new URL(productBrowseReturnHref(href), "https://zeroloss.local");
  if (url.pathname === "/account/crew") return "Your Crew";
  if (url.pathname === "/account/favorites") return url.searchParams.get("tab") === "shared" ? "Shared with You" : "Favorites";
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
