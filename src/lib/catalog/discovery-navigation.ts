import type { BrowseFilterState } from "./browse-filters";
import type { MarketplaceCategoryId } from "./navigation";
import type { EndingSoonTicketRange } from "./ending-soon-ticket-ranges";

/** A retailer refines the current category. A different department replaces it. */
export function discoveryCategoryHref(groupId: string, filters: BrowseFilterState, selectedCategory: MarketplaceCategoryId | null, retailer = "", ticketsLeft?: EndingSoonTicketRange | null, searchTerm = "") {
  const params = new URLSearchParams();
  if (selectedCategory && (retailer || selectedCategory === "ending-soon")) params.set("category", selectedCategory);
  if (groupId) params.set("partnerCategory", groupId);
  if (retailer) params.set("retailer", retailer);
  if (selectedCategory === "ending-soon" && ticketsLeft) params.set("ticketsLeft", ticketsLeft);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.availableOnly) params.set("available", "1");
  if (filters.minValue !== null) params.set("minValue", String(filters.minValue));
  if (filters.maxValue !== null) params.set("maxValue", String(filters.maxValue));
  if (filters.sort !== "featured" || (selectedCategory === "ending-soon" && filters.featuredExplicit)) params.set("sort", filters.sort);
  if (searchTerm.trim()) params.set("q", searchTerm.trim());
  return `/browse${params.size ? `?${params}` : ""}#search-results`;
}
