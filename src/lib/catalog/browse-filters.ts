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
  minValue: number | null;
  maxValue: number | null;
};

export type RetailerFilterGroup = { id: string; category: string; options: { label: string; value: string; hasOffer: boolean }[] };

const productTypes: BrowseProductType[] = ["all", "pictured", "gift-cards"];
const sortOptions: BrowseSort[] = ["featured", "fewest-left", "price-low", "value-high"];

function parsePrizeValue(value: string | undefined): number | null {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount <= 1_000_000 ? amount : null;
}

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
    minValue: parsePrizeValue(first(query.minValue)),
    maxValue: parsePrizeValue(first(query.maxValue)),
  };
}

export function browseRetailers(products: readonly DemoProduct[]): string[] {
  return [...new Set(products.map(product => product.retailer.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function retailerKey(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[®™’']/g, "").replace(/[^a-z0-9]+/g, "");
}

function retailerCategoryId(category: string) {
  return category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const groceryRelatedBrands = {
  convenience: new Set(["Pilot Flying J", "Sheetz", "Speedway"]),
  pharmacy: new Set(["CVS®", "Walgreens"]),
  gas: new Set(["BP", "Pilot Flying J", "Sheetz", "Speedway"]),
};

const homeImprovementBrands = new Set(["Ace Hardware", "Lowe’s®", "Menards®", "The Home Depot®"]);

export function retailerFilterGroups(partnerGroups: readonly GiftCardPartnerGroup[], products: readonly DemoProduct[]): RetailerFilterGroup[] {
  const active = browseRetailers(products);
  const activeByKey = new Map(active.map(name => [retailerKey(name), name]));
  const matched = new Set<string>();
  const optionsFor = (brands: readonly string[]) => brands.map(label => {
      const currentName = activeByKey.get(retailerKey(label));
      if (currentName) matched.add(currentName);
      return { label, value: currentName ?? label, hasOffer: Boolean(currentName) };
    });
  const groups: RetailerFilterGroup[] = partnerGroups.flatMap(group => {
    if (group.category === "Cryptocurrency") return [];
    if (group.category === "Grocery, Convenience, Pharmacy & Gas") {
      const groceries = group.brands.filter(brand => !groceryRelatedBrands.gas.has(brand) && !groceryRelatedBrands.pharmacy.has(brand));
      return [
        { id: "groceries", category: "Groceries", options: optionsFor(groceries) },
        { id: "convenience", category: "Convenience", options: optionsFor(group.brands.filter(brand => groceryRelatedBrands.convenience.has(brand))) },
        { id: "pharmacy", category: "Pharmacy", options: optionsFor(group.brands.filter(brand => groceryRelatedBrands.pharmacy.has(brand))) },
        { id: "gas", category: "Gas", options: optionsFor(group.brands.filter(brand => groceryRelatedBrands.gas.has(brand))) },
      ];
    }
    if (group.category === "Home Furnishings & Improvement") {
      return [
        { id: "home-furnishings", category: "Home Furnishings", options: optionsFor(group.brands.filter(brand => !homeImprovementBrands.has(brand))) },
        { id: "home-improvement", category: "Home Improvement", options: optionsFor(group.brands.filter(brand => homeImprovementBrands.has(brand))) },
      ];
    }
    return [{ id: retailerCategoryId(group.category), category: group.category, options: optionsFor(group.brands) }];
  });
  const notInDirectory = active.filter(name => !matched.has(name));
  if (notInDirectory.length) groups.push({ id: "other-current-offers", category: "Other current offers", options: notInDirectory.map(name => ({ label: name, value: name, hasOffer: true })) });
  return groups;
}

export function filterBrowseProducts(products: readonly DemoProduct[], filters: BrowseFilterState, searchTerm = "", picturedFirstInFewest = false, allowedRetailers?: ReadonlySet<string>): DemoProduct[] {
  const result = products.filter(product =>
    (filters.type === "all" || (filters.type === "gift-cards") === isGiftCardListing(product))
    && (!allowedRetailers || allowedRetailers.has(product.retailer))
    && (!filters.retailer || product.retailer === filters.retailer)
    && (!filters.availableOnly || product.sold < product.capacity)
    && (filters.minValue === null || product.value >= filters.minValue)
    && (filters.maxValue === null || product.value <= filters.maxValue)
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
