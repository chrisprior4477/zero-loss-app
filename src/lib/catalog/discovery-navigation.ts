import type { BrowseFilterState } from "./browse-filters";
import type { MarketplaceCategoryId } from "./navigation";

/** Switching departments must not intersect Automotive with a previous Groceries search. */
export function discoveryCategoryHref(groupId: string, filters: BrowseFilterState, selectedCategory: MarketplaceCategoryId | null, retailer = "") {
  const params = new URLSearchParams();
  if (selectedCategory === "ending-soon") params.set("category", "ending-soon");
  if (groupId) params.set("partnerCategory", groupId);
  if (retailer) params.set("retailer", retailer);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.availableOnly) params.set("available", "1");
  if (filters.minValue !== null) params.set("minValue", String(filters.minValue));
  if (filters.maxValue !== null) params.set("maxValue", String(filters.maxValue));
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  return `/browse${params.size ? `?${params}` : ""}#search-results`;
}
