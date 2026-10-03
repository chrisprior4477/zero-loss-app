import type { DemoProduct } from "./demo-products";
import { isGiftCardListing } from "./navigation";
import type { GiftCardPartnerGroup } from "./gift-card-partners";

export type BrowseProductType = "all" | "pictured" | "gift-cards";
export type BrowseSort = "featured" | "fewest-left" | "price-low" | "value-high";

export type BrowseFilterState = {
  type: BrowseProductType;
  retailer: string;
  availableOnly: boolean;
  sort: BrowseSort;
};

export type RetailerFilterGroup = { category: string; options: { label: string; value: string; hasOffer: boolean }[] };

const productTypes: BrowseProductType[] = ["all", "pictured", "gift-cards"];
const sortOptions: BrowseSort[] = ["featured", "fewest-left", "price-low", "value-high"];

export function parseBrowseFilterState(query: Record<string, string | string[] | undefined>, retailers: readonly string[]): BrowseFilterState {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const type = first(query.type);
  const sort = first(query.sort);
  const retailer = first(query.retailer) ?? "";
  return {
    type: productTypes.includes(type as BrowseProductType) ? type as BrowseProductType : "all",
    retailer: retailers.includes(retailer) ? retailer : "",
    availableOnly: first(query.available) === "1",
    sort: sortOptions.includes(sort as BrowseSort) ? sort as BrowseSort
      : sort === "ending-soon" || first(query.category) === "ending-soon" ? "fewest-left" : "featured",
  };
}

export function browseRetailers(products: readonly DemoProduct[]): string[] {
  return [...new Set(products.map(product => product.retailer.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function retailerKey(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[®™’']/g, "").replace(/[^a-z0-9]+/g, "");
}

export function retailerFilterGroups(partnerGroups: readonly GiftCardPartnerGroup[], products: readonly DemoProduct[]): RetailerFilterGroup[] {
  const active = browseRetailers(products);
  const activeByKey = new Map(active.map(name => [retailerKey(name), name]));
  const matched = new Set<string>();
  const groups: RetailerFilterGroup[] = partnerGroups.map(group => ({
    category: group.category,
    options: group.brands.map(label => {
      const currentName = activeByKey.get(retailerKey(label));
      if (currentName) matched.add(currentName);
      return { label, value: currentName ?? label, hasOffer: Boolean(currentName) };
    }),
  }));
  const notInDirectory = active.filter(name => !matched.has(name));
  if (notInDirectory.length) groups.push({ category: "Other current offers", options: notInDirectory.map(name => ({ label: name, value: name, hasOffer: true })) });
  return groups;
}

export function filterBrowseProducts(products: readonly DemoProduct[], filters: BrowseFilterState, searchTerm = "", picturedFirstInFewest = false): DemoProduct[] {
  const result = products.filter(product =>
    (filters.type === "all" || (filters.type === "gift-cards") === isGiftCardListing(product))
    && (!filters.retailer || product.retailer === filters.retailer)
    && (!filters.availableOnly || product.sold < product.capacity)
  );
  const remaining = (product: DemoProduct) => Math.max(0, product.capacity - product.sold);
  const picturedFirst = (left: DemoProduct, right: DemoProduct) =>
    Number(isGiftCardListing(left)) - Number(isGiftCardListing(right));
  const availableFirst = (left: DemoProduct, right: DemoProduct) =>
    Number(remaining(left) === 0) - Number(remaining(right) === 0);

  return result.sort((left, right) => {
    switch (filters.sort) {
      case "fewest-left":
        return (picturedFirstInFewest && !searchTerm ? picturedFirst(left, right) : 0)
          || availableFirst(left, right)
          || remaining(left) - remaining(right)
          || left.title.localeCompare(right.title);
      case "price-low":
        return left.entryPrice - right.entryPrice || left.title.localeCompare(right.title);
      case "value-high":
        return right.value - left.value || left.title.localeCompare(right.title);
      default:
        return searchTerm ? 0 : picturedFirst(left, right) || left.title.localeCompare(right.title);
    }
  });
}
