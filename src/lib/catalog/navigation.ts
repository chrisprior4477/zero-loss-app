import type { DemoProduct } from "./demo-products";

export const marketplaceCategories = [
  { id: "ending-soon", label: "Ending Soon" },
  { id: "everyday-items", label: "Everyday Items" },
  { id: "groceries", label: "Groceries" },
  { id: "gas", label: "Gas" },
  { id: "electronics", label: "Electronics" },
  { id: "gift-cards", label: "Gift Cards" },
  { id: "home-essentials", label: "Home Essentials" },
] as const;

export type MarketplaceCategoryId = (typeof marketplaceCategories)[number]["id"];

const categoryAliases: Record<string, MarketplaceCategoryId> = {
  "ending soon": "ending-soon",
  "everyday items": "everyday-items",
  groceries: "groceries",
  gas: "gas",
  electronics: "electronics",
  "home electronics": "electronics",
  "gift cards": "gift-cards",
  "home essentials": "home-essentials",
};

export function marketplaceCategoryId(value: string): MarketplaceCategoryId | null {
  const normalized = value.trim().toLowerCase();
  return marketplaceCategories.some((category) => category.id === normalized)
    ? normalized as MarketplaceCategoryId
    : categoryAliases[normalized] ?? null;
}

export function marketplaceCategoryHref(value: string, subcategory?: string): string {
  const id = marketplaceCategoryId(value);
  const params = new URLSearchParams();
  if (id === "ending-soon") params.set("sort", "ending-soon");
  else if (id) params.set("category", id);
  if (subcategory) params.set("subcategory", subcategory);
  const query = params.toString();
  return query ? `/browse?${query}` : "/browse";
}

const includesAny = (value: string, needles: readonly string[]) =>
  needles.some((needle) => value.includes(needle));

export function productMatchesMarketplaceCategory(product: DemoProduct, category: MarketplaceCategoryId): boolean {
  const haystack = `${product.category} ${product.title} ${product.brand} ${product.retailer}`.toLowerCase();
  switch (category) {
    case "ending-soon":
      return product.capacity - product.sold <= 25;
    case "everyday-items":
      return includesAny(haystack, ["grocery", "shopping", "essentials", "baby", "health", "pet", "home", "coffee", "dining"]);
    case "groceries":
      return includesAny(haystack, ["grocery", "publix", "walmart", "baby essentials", "coffee", "dunkin"]);
    case "gas":
      return includesAny(haystack, [" gas ", "fuel", "convenience"]);
    case "electronics":
      return includesAny(haystack, ["electronics", "gaming", "television", " tv", "best buy", "nintendo", "netflix"]);
    case "gift-cards":
      return /gift card|shopping reward/i.test(product.title);
    case "home-essentials":
      return includesAny(haystack, ["home essentials", "homegoods", "home depot", "lowe", "vacuum", "baby essentials"]);
  }
}
