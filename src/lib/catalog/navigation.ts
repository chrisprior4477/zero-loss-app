import type { DemoProduct } from "./demo-products";
import { availabilityStatus } from "./availability";

export const marketplaceCategories = [
  { id: "ending-soon", label: "Ending Soon" },
  { id: "everyday-items", label: "Everyday Items" },
  { id: "groceries", label: "Groceries" },
  { id: "gas", label: "Gas" },
  { id: "electronics", label: "Electronics" },
  { id: "gift-cards", label: "Gift Cards" },
  { id: "home-essentials", label: "Home Essentials" },
  { id: "movie-night", label: "Movie Night" },
  { id: "outdoors", label: "Outdoor & Camping" },
  { id: "tools-diy", label: "Tools & DIY" },
  { id: "kitchen", label: "Kitchen" },
  { id: "sports-fitness", label: "Sports & Fitness" },
  { id: "pets", label: "Pet Supplies" },
  { id: "fishing", label: "Fishing" },
  { id: "health", label: "Health" },
  { id: "beauty", label: "Beauty" },
  { id: "arts-crafts", label: "Arts & Crafts" },
  { id: "travel", label: "Travel" },
  { id: "games-puzzles", label: "Games & Puzzles" },
] as const;

export type MarketplaceCategoryId = (typeof marketplaceCategories)[number]["id"];

const categoryAliases: Record<string, MarketplaceCategoryId> = {
  "ending soon": "ending-soon",
  "almost full": "ending-soon",
  "everyday items": "everyday-items",
  groceries: "groceries",
  gas: "gas",
  electronics: "electronics",
  "home electronics": "electronics",
  "gift cards": "gift-cards",
  "home essentials": "home-essentials",
  "movie night": "movie-night",
};

const collectionRetailers = {
  health: ["CVS", "Walgreens", "The Vitamin Shoppe®", "Dick's Sporting Goods", "Target"],
  beauty: ["Ulta", "Sephora", "Walgreens", "Target", "Macy's", "Nordstrom", "Bath & Body Works"],
  "arts-crafts": ["Michaels", "Target", "Walmart"],
  travel: ["REI", "Macy's", "Nordstrom", "Kohl's", "Dick's Sporting Goods"],
  "games-puzzles": ["Gamestop®", "Barnes & Noble", "Target", "Walmart"],
} satisfies Partial<Record<MarketplaceCategoryId, readonly string[]>>;

export function isRetailerCollection(category: MarketplaceCategoryId): category is keyof typeof collectionRetailers {
  return Object.hasOwn(collectionRetailers, category);
}

// The Movie Night collection is deliberately curated from existing offerings.
const movieNightSlugs = new Set([
  "samsung-m70h-tv", "lg-oled-c6-65-tv", "netflix-25-gift-card",
  "directory-hulu-100-gift-card", "directory-paramount-100-gift-card",
  "directory-amc-theaters-100-gift-card", "directory-cinemark-100-gift-card",
  "directory-fandango-100-gift-card", "directory-regal-100-gift-card",
  "directory-the-popcorn-factory-100-gift-card",
]);

export function marketplaceCategoryId(value: string): MarketplaceCategoryId | null {
  const normalized = value.trim().toLowerCase();
  return marketplaceCategories.some((category) => category.id === normalized)
    ? normalized as MarketplaceCategoryId
    : marketplaceCategories.find(category => category.label.toLowerCase() === normalized)?.id ?? categoryAliases[normalized] ?? null;
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

/** A pictured item leads category browsing; retailer gift-card listings follow. */
export function isGiftCardListing(product: DemoProduct): boolean {
  return product.gallery[0]?.fit === "reward"
    || /gift[ -]?card/i.test(`${product.slug} ${product.title}`);
}

const includesAny = (value: string, needles: readonly string[]) =>
  needles.some((needle) => value.includes(needle));

export function productMatchesMarketplaceCategory(product: DemoProduct, category: MarketplaceCategoryId): boolean {
  if (category !== "ending-soon" && product.collections) return product.collections.includes(category);
  if (isRetailerCollection(category)) return isGiftCardListing(product) && collectionRetailers[category].includes(product.retailer);
  const haystack = `${product.category} ${product.title} ${product.brand} ${product.retailer}`.toLowerCase();
  switch (category) {
    case "ending-soon":
      return availabilityStatus(product.capacity, product.sold).almostFull;
    case "everyday-items":
      return includesAny(haystack, ["grocery", "shopping", "essentials", "baby", "health", "pet", "home", "coffee", "dining"]);
    case "groceries":
      return includesAny(haystack, ["grocery", "publix", "walmart", "baby essentials", "coffee", "dunkin"]);
    case "gas":
      return includesAny(haystack, [" gas ", "fuel", "convenience"]);
    case "electronics":
      return includesAny(haystack, ["electronics", "gaming", "television", " tv", "best buy", "nintendo", "netflix"]);
    case "gift-cards":
      return isGiftCardListing(product) || /shopping reward/i.test(product.title);
    case "home-essentials":
      return includesAny(haystack, ["home essentials", "homegoods", "home depot", "lowe", "vacuum", "baby essentials"]);
    case "movie-night":
      return movieNightSlugs.has(product.slug);
    case "tools-diy":
      return product.slug === "dewalt-20v-drill-kit";
    case "outdoors": case "kitchen": case "sports-fitness": case "pets": case "fishing":
      return false;
  }
}
