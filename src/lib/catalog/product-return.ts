import { marketplaceCategories, marketplaceCategoryId } from "./navigation";
import { getPopularRewardBrand, popularRewardAmounts, popularRewardProductSlug } from "./popular-rewards";
import { savedShareHref, shareUuid } from "../sharing/saved-shares";
import { crewPickReturnPath } from "../crew/view-return";
import { isEntryQuantity } from "../entries/quantity";
import { groceryThemes } from "./grocery-themes";
import { parseEndingSoonTicketRange } from "./ending-soon-ticket-ranges";
import { catalogSearchTooLong } from "./search-text";

// Covers a validated Browse return after it is escaped as a nested query field.
export const maxNestedBrowseReturnLength = 24_576;

const browseQueryKeys = new Set([
  "category", "sort", "subcategory", "q", "type", "retailer",
  "partnerCategory", "available", "minValue", "maxValue", "batch", "groceryIdea", "ticketsLeft",
]);

/** Allow only known shopping destinations, including the personal Favorites list. */
export function productBrowseReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > (value.startsWith("/browse?") ? 8192 : 1000) || /[\\\s\u0000-\u001f]/.test(value)) return null;
  if (value === "/account/favorites" || /^\/(?:\?ending-prize=[a-z0-9]+(?:-[a-z0-9]+)*)?#ending-soon$/.test(value)) return value;
  if (/^\/\?(?:choice-prize=[a-z0-9]+(?:-[a-z0-9]+)*#dollar-choice-title|upgrade-prize=[a-z0-9]+(?:-[a-z0-9]+)*#dollar-choice-light-title)$/.test(value)) return value;
  const transaction = /^\/account\/wallet\?view=history&transaction=([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:&walletView=1)?(?:&panel=transactions&fromOrders=1&orderFilter=(?:all|processing|fulfilled|exceptions|payment))?#transaction-\1$/i;
  if (transaction.test(value)) return value;
  if (/^\/\?marketplace-prize=[a-z0-9]+(?:-[a-z0-9]+)*#marketplace-mosaic-title$/.test(value)) return value;
  const crew = crewPickReturnPath(value);
  if (crew) return crew;
  if (value.startsWith("/account/favorites?")) {
    const url = new URL(value, "https://zeroloss.local");
    const keys = [...url.searchParams.keys()];
    const item = url.searchParams.get("item");
    const watching = url.searchParams.get("watch") === "1";
    if (!url.hash && new Set(keys).size === keys.length && keys.every(key => key === "item" || key === "watch")
      && (!url.searchParams.has("watch") || watching) && (item === null || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item))) {
      const params = new URLSearchParams();
      if (item) params.set("item", item);
      if (watching) params.set("watch", "1");
      return `/account/favorites${params.size ? `?${params}` : ""}`;
    }
    const share = url.searchParams.get("share");
    if (url.hash || url.searchParams.get("tab") !== "shared"
      || keys.some(key => key !== "tab" && key !== "share" && key !== "view") || new Set(keys).size !== keys.length
      || (url.searchParams.has("view") && !["available", "declined"].includes(url.searchParams.get("view")!))
      || (share !== null && !shareUuid.test(share))) return null;
    return savedShareHref(share ?? undefined, url.searchParams.get("view") === "declined" ? "declined" : "available");
  }
  const retailer = /^\/rewards\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:#prize-([a-z0-9]+(?:-[a-z0-9]+)*))?$/.exec(value);
  if (retailer) {
    const brand = getPopularRewardBrand(retailer[1]);
    if (!brand) return null;
    if (!retailer[2] || popularRewardAmounts.some(amount => popularRewardProductSlug(brand.slug, amount) === retailer[2])) return value;
    const denomination = /-([1-9]\d{0,5})-gift-card$/.exec(retailer[2]);
    return denomination && popularRewardProductSlug(brand.slug, Number(denomination[1])) === retailer[2] ? value : null;
  }
  const denominationList = /^\/rewards\/([a-z0-9]+(?:-[a-z0-9]+)*)#reward-values$/.exec(value);
  if (denominationList && getPopularRewardBrand(denominationList[1])) return value;
  if (!/^\/browse(?:[?#]|$)/.test(value)) return null;
  try {
    const url = new URL(value, "https://zeroloss.local");
    if (url.origin !== "https://zeroloss.local" || url.pathname !== "/browse") return null;
    const preview = /^#category-preview~(?:top|bottom)~([a-z0-9-]*)~[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(url.hash);
    if (url.hash && !/^(?:#search-results|#browse-search-input|#ending-soon-search-input|#prize-[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(url.hash)
      && !(preview && (!preview[1] || marketplaceCategories.some(category => category.id === preview[1])))) return null;
    const batch = url.searchParams.get("batch");
    const category = url.searchParams.get("category") ?? (url.searchParams.get("sort") === "ending-soon" ? "ending-soon" : "");
    const endingSoon = marketplaceCategoryId(category) === "ending-soon";
    const ticketsLeft = url.searchParams.get("ticketsLeft");
    if (ticketsLeft !== null && (!endingSoon || !parseEndingSoonTicketRange(ticketsLeft))) return null;
    if (batch !== null && !(endingSoon && (batch === "last" || /^last-(?:[2-9]|[1-9]\d{1,5})$/.test(batch)))
      && (!/^[1-9]\d*$/.test(batch) || !Number.isSafeInteger(Number(batch)))) return null;
    const idea = url.searchParams.get("groceryIdea");
    if (idea !== null && (url.searchParams.get("category") !== "groceries" || !groceryThemes.some(theme => theme.id === idea))) return null;
    const keys = [...url.searchParams.keys()];
    const search = url.searchParams.get("q");
    if (search && catalogSearchTooLong(search)) return null;
    url.searchParams.delete("q");
    if (url.href.length > 1024) return null;
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
export function freeEntryHref(slug: string, browseReturn: unknown, quantity?: number | null, share?: unknown): string {
  const params = new URLSearchParams({ offering: slug });
  if (isEntryQuantity(quantity) && quantity > 1) params.set("quantity", String(quantity));
  const browse = productBrowseReturnPath(browseReturn);
  if (browse) params.set("from", browse);
  if (typeof share === "string" && shareUuid.test(share)) params.set("share", share);
  return `/free-entry?${params.toString()}`;
}

export function productBrowseReturnLabel(href: string): string {
  const url = new URL(productBrowseReturnHref(href), "https://zeroloss.local");
  if (url.pathname === "/" && url.hash === "#ending-soon") return "Ending Soon";
  if (url.pathname === "/" && url.hash === "#marketplace-mosaic-title") return "Browse the marketplace";
  if (url.pathname === "/" && url.hash === "#dollar-choice-title") return "the $1 prize rail";
  if (url.pathname === "/" && url.hash === "#dollar-choice-light-title") return "Everyday Upgrades";
  if (url.pathname === "/account/wallet") return "this transaction";
  if (url.pathname === "/account/crew") return "Your Crew";
  if (url.pathname === "/account/favorites") return url.searchParams.get("tab") === "shared" ? "Shared with You" : "Favorites";
  if (url.pathname.startsWith("/rewards/")) {
    const brand = getPopularRewardBrand(url.pathname.slice("/rewards/".length));
    if (brand) return `${brand.name} rewards`;
  }
  const category = marketplaceCategories.find((item) => item.id === marketplaceCategoryId(url.searchParams.get("category") ?? ""));
  if (category) return category.label;
  if (url.searchParams.get("sort") === "ending-soon") return "Ending Soon";
  if (url.searchParams.has("q")) return "Search results";
  return "marketplace";
}
