/**
 * PLACEHOLDER FIXTURES — not real marketplace data.
 *
 * Every value here is hard-coded so the homepage can be laid out and reviewed
 * before catalog, pool, and ledger data exist. Nothing in this file reads the
 * database, and no component that consumes it performs a fetch.
 *
 * When real data lands, this file is the single swap point: replace these
 * exports with server-side reads and the consuming components keep their
 * existing prop shapes.
 *
 * Fixture values deliberately respect the locked pricing rules in
 * `docs/product/marketplace-financial-rules-spec.md` so reviewers are never
 * shown numbers that contradict the spec:
 *   - §1.1  entries are a fixed 3-to-1 ratio of DISPLAYED FACE VALUE only.
 *           Acquisition cost is never an input, here or anywhere else.
 *   - §1.2  entry counts are clean numbers ending in 25, 50, 75, or 00.
 *
 * The first catalog pass uses founder-directed retailer product imagery for
 * the private investor demo. This is a deliberate temporary exception that
 * conflicts with financial-rules §2.3; licensing/authorization and the locked
 * rule must be reconciled before public launch.
 *
 * Vocabulary follows C10: Opportunity, Entry, Prize, Pool. The word "drop"
 * from the artboards is not used.
 */

import { repeatedHomepageProducts } from "@/lib/home/demo-data";

/** Status pill on a card. Semantic roles only — green is live activity,
 *  orange is genuine urgency, cyan is neutral emphasis. */
export type OpportunityStatus = "closing" | "new" | "popular";

export type PlaceholderOpportunity = {
  id: string;
  title: string;
  category: string;
  /** Displayed face value of the prize, preformatted for display. */
  faceValueLabel: string;
  /** Entry cost callout in the spec's format, e.g. "$1 Entry" (§15, C10). */
  entryPriceLabel: string;
  /** Face value x 3, rounded to a clean number (financial rules §1.1, §1.2). */
  ticketCapacity: number;
  ticketsSold: number;
  status: OpportunityStatus;
  statusLabel: string;
  /** Path under /public. Demo imagery; confirm production usage rights before launch. */
  image: string;
  /** Product-detail route when this fixture has a built demo item page. */
  href?: string;
};

export const placeholderFeaturedOpportunities: PlaceholderOpportunity[] = [
  {
    id: "placeholder-featured-1",
    title: repeatedHomepageProducts.tv.title,
    category: "Electronics",
    faceValueLabel: `$${repeatedHomepageProducts.tv.prizeValue.toLocaleString()}`,
    entryPriceLabel: "$1 Entry",
    ticketCapacity: repeatedHomepageProducts.tv.entryCapacity,
    ticketsSold: repeatedHomepageProducts.tv.entriesSold,
    status: "closing",
    statusLabel: "Closing soon",
    image: "/catalog/samsung-m70h-tv-real.png",
    href: "/items/samsung-m70h-tv",
  },
  {
    id: "placeholder-featured-2",
    title: repeatedHomepageProducts.shoes.title,
    category: "Trophy Vault",
    faceValueLabel: `$${repeatedHomepageProducts.shoes.prizeValue.toLocaleString()}`,
    entryPriceLabel: "$1 Entry",
    ticketCapacity: repeatedHomepageProducts.shoes.entryCapacity,
    ticketsSold: repeatedHomepageProducts.shoes.entriesSold,
    status: "closing",
    statusLabel: "Closing soon",
    image: "/catalog/nike-court-shot-side-cutout.png",
    href: "/items/nike-court-shot-shoes",
  },
  {
    id: "placeholder-featured-3",
    title: repeatedHomepageProducts.babyEssentials.title,
    category: "Home Essentials",
    faceValueLabel: `$${repeatedHomepageProducts.babyEssentials.prizeValue.toLocaleString()}`,
    entryPriceLabel: "$1 Entry",
    ticketCapacity: repeatedHomepageProducts.babyEssentials.entryCapacity,
    ticketsSold: repeatedHomepageProducts.babyEssentials.entriesSold,
    status: "closing",
    statusLabel: "Closing soon",
    image: "/catalog/babys-essentials-bundle-angled-real.png",
    href: "/items/babys-essentials-bundle",
  },
];

export const placeholderDiscoveryOpportunities: PlaceholderOpportunity[] = [
  {
    id: "placeholder-discovery-1",
    title: "$25 Dunkin' Donuts Gift Card",
    category: "Groceries & Gas",
    faceValueLabel: "$25",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 75,
    ticketsSold: 71,
    status: "closing",
    statusLabel: "Closing soon",
    image: "/design/2a-espresso.webp",
  },
  {
    id: "placeholder-discovery-2",
    title: "$75 HomeGoods Gift Card",
    category: "Home Essentials",
    faceValueLabel: "$75",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 225,
    ticketsSold: 118,
    status: "popular",
    statusLabel: "Popular",
    image: "/design/5a-c3.webp",
  },
  {
    id: "placeholder-discovery-3",
    title: "$150 Lowe's Appliance Gift Card",
    category: "Home Essentials",
    faceValueLabel: "$150",
    entryPriceLabel: "$2 Entry",
    ticketCapacity: 450,
    ticketsSold: 203,
    status: "popular",
    statusLabel: "Popular",
    image: "/design/2a-espresso.webp",
  },
  {
    id: "placeholder-discovery-4",
    title: "$50 Bed Bath & Beyond + Wayfair Bundle",
    category: "Gift Cards",
    faceValueLabel: "$50",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 150,
    ticketsSold: 24,
    status: "new",
    statusLabel: "Just listed",
    image: "/design/5a-c3.webp",
  },
  {
    id: "placeholder-discovery-5",
    title: "$100 Best Buy Gift Card",
    category: "Electronics",
    faceValueLabel: "$100",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 300,
    ticketsSold: 288,
    status: "closing",
    statusLabel: "Closing soon",
    image: "/design/2a-headphones.webp",
  },
  {
    id: "placeholder-discovery-6",
    title: "$25 Netflix Gift Card",
    category: "Movie Night",
    faceValueLabel: "$25",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 75,
    ticketsSold: 39,
    status: "new",
    statusLabel: "Just listed",
    image: "/design/2a-bike.webp",
  },
];

/**
 * Development-only rebate amount used to exercise the homepage banner layout.
 * This is not a customer balance and must be replaced by an authoritative
 * ledger-derived value before the banner is presented as account data.
 */
export const placeholderRebateCreditAmount = "$18";

export type PlaceholderCategoryCard = {
  id: string;
  label: string;
  image: string;
};

/** Development-only homepage category artwork and ordering. */
export const placeholderCategoryCards: PlaceholderCategoryCard[] = [
  { id: "groceries", label: "Groceries", image: "/design/5a-c3.webp" },
  { id: "everyday-items", label: "Everyday Items", image: "/design/lady-with-bag.webp" },
  { id: "gas", label: "Gas", image: "/design/2a-espresso.webp" },
  { id: "electronics", label: "Electronics", image: "/design/2a-headphones.webp" },
  { id: "gift-cards", label: "Gift Cards", image: "/design/5a-c3.webp" },
];

/** Development ordering only. Production ranking must come from real data. */
export const placeholderPopularBrands = [
  "Nike", "Apple", "Amazon", "Costco", "Walmart", "Target",
] as const;

/**
 * Category strip, ordered to match the Checkpoint 2 artboards.
 *
 * "Ending Soon" and "Everyday Items" lead, as they do in the design. An
 * earlier revision dropped both, reading C6 ("keep the existing category
 * taxonomy rather than the design.s version") as excluding them — but those
 * two are merchandising entries rather than taxonomy, and removing them
 * visibly changed the top of the nav.
 *
 * "All" from spec §7 is currently not shown, because the design has no such
 * chip and "Everyday Items" fills the browse-everything role.
 */
export const homeCategories = [
  "Ending Soon",
  "Everyday Items",
  "Groceries & Gas",
  "Movie Night",
  "Electronics",
  "Home Essentials",
  "Gift Cards",
  "Trophy Vault",
] as const;

/** Promo rail tiles from the artboards, using our approved vocabulary (C10). */
export const placeholderPromoTiles = [
  { id: "promo-1", label: "WHAT'S NEW", href: "/browse" },
  { id: "promo-2", label: "ENDING SOON", href: "/browse" },
  { id: "promo-3", label: "WINNERS", href: "/browse" },
  { id: "promo-4", label: "FEATURED", href: "/browse" },
  { id: "promo-5", label: "EVERYDAY ITEMS", href: "/browse" },
  { id: "promo-6", label: "GIFT CARDS", href: "/browse" },
  { id: "promo-7", label: "TROPHY VAULT", href: "/browse" },
] as const;

/** Development-only price navigation. Production links will use live catalog filters. */
export const shopByPriceTiers = [
  { price: "$25", detail: "and under" },
  { price: "$50", detail: "and under" },
  { price: "$75", detail: "and under" },
  { price: "$100", detail: "and under" },
  { price: "$100+", detail: "premium prizes" },
  { price: "ONE OF A KIND", detail: "rare prizes" },
] as const;

/**
 * Category → subcategory taxonomy for the nav dropdowns, transcribed from the
 * Checkpoint 2 desktop artboard (2a), which carries ten children per category.
 *
 * Two deliberate departures, both following from C6 (keep our taxonomy, not
 * the design's):
 *
 * - "All" has no menu. In the artboards the first chip is "Ending Soon", a
 *   curated list of individual items; ours is "All", which means "no filter"
 *   and has nothing to expand into.
 * - "Home Essentials" is a top-level category for us but only a child of the
 *   artboard's "Everyday Items". Its children here are the rest of that
 *   Everyday Items list, with "Groceries & Gas" (already top-level) and
 *   "Home Essentials" (itself) removed.
 */
export const categorySubcategories: Record<string, readonly string[]> = {
  "Groceries & Gas": [
    "Gas Cards",
    "Grocery Gift Cards",
    "Meal Kits",
    "Coffee & Tea",
    "Snack Boxes",
    "Beverages",
    "Pantry Staples",
    "Fresh Produce Credit",
    "Bulk Essentials",
    "Convenience Bundles",
  ],
  "Movie Night": [
    "Streaming Gift Cards",
    "Home Theater Systems",
    "Projectors",
    "Sound Bars",
    "Popcorn Makers",
    "Blu-ray Collections",
    "Recliners",
    "Board Games",
    "Snack Bundles",
    "Movie Tickets",
  ],
  Electronics: [
    "Phones",
    "Laptops",
    "Headphones",
    "Smart Home",
    "Gaming Consoles",
    "Cameras",
    "TVs",
    "Tablets",
    "Wearables",
    "Speakers",
  ],
  "Home Essentials": [
    "Kitchen & Dining",
    "Cleaning Supplies",
    "Pet Supplies",
    "Baby & Kids",
    "Office Supplies",
    "Personal Care",
    "Snacks & Drinks",
    "Small Appliances",
  ],
  "Gift Cards": [
    "Retail",
    "Restaurants",
    "Travel",
    "Streaming",
    "Gas",
    "Grocery",
    "Electronics Stores",
    "Home Improvement",
    "Experiences",
    "Prepaid Visa",
  ],
  "Trophy Vault": [
    "Watches",
    "Jewelry",
    "Sneakers",
    "Handbags",
    "Art",
    "Wine & Spirits",
    "Rare Collectibles",
    "Trading Cards",
    "Autographed Memorabilia",
    "Vintage Electronics",
  ],
};

/* Menus for the two merchandising chips that lead the strip, from the
   artboards. "Ending Soon" lists individual items rather than subcategories,
   which is why it reads differently from the taxonomy menus above. */
categorySubcategories["Ending Soon"] = [
  'Samsung 50" M70H Smart TV',
  "Nike Men's Court Shot Shoes",
  "Baby's Essentials Bundle",
  "Stand mixer",
  "Cordless drill set",
  "4K OLED TV",
  "Air fryer",
  "4-person camping tent",
  "Electric grill",
  "Robot vacuum",
  "Instant Pot",
];

/** Detail routes available in the current investor-demo catalog. */
export const endingSoonItemHrefs: Record<string, string> = {
  'Samsung 50" M70H Smart TV': "/items/samsung-m70h-tv",
  "Nike Men's Court Shot Shoes": "/items/nike-court-shot-shoes",
  "Baby's Essentials Bundle": "/items/babys-essentials-bundle",
};

categorySubcategories["Everyday Items"] = [
  "Groceries & Gas",
  "Home Essentials",
  "Kitchen & Dining",
  "Cleaning Supplies",
  "Pet Supplies",
  "Baby & Kids",
  "Office Supplies",
  "Personal Care",
  "Snacks & Drinks",
  "Small Appliances",
];
