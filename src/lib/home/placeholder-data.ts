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
 *   - §2.3  no scraped or reproduced brand product photography. Cards render
 *           a neutral tile instead of an image until licensed art exists.
 */

export type PlaceholderProduct = {
  id: string;
  title: string;
  category: string;
  /** Displayed face value of the prize, preformatted for display. */
  faceValueLabel: string;
  /** Entry cost callout, e.g. "$1 Entry" (spec §15). */
  entryPriceLabel: string;
  /** Face value x 3, rounded to a clean number (financial rules §1.1, §1.2). */
  ticketCapacity: number;
  ticketsSold: number;
};

export const placeholderFeaturedProducts: PlaceholderProduct[] = [
  {
    id: "placeholder-featured-1",
    title: "$100 Everyday Essentials Card",
    category: "Groceries & Gas",
    faceValueLabel: "$100",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 300,
    ticketsSold: 276,
  },
  {
    id: "placeholder-featured-2",
    title: "$50 Movie Night Card",
    category: "Movie Night",
    faceValueLabel: "$50",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 150,
    ticketsSold: 92,
  },
  {
    id: "placeholder-featured-3",
    title: "$200 Electronics Card",
    category: "Electronics",
    faceValueLabel: "$200",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 600,
    ticketsSold: 141,
  },
];

export const placeholderDiscoveryProducts: PlaceholderProduct[] = [
  {
    id: "placeholder-discovery-1",
    title: "$25 Coffee Run Card",
    category: "Groceries & Gas",
    faceValueLabel: "$25",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 75,
    ticketsSold: 71,
  },
  {
    id: "placeholder-discovery-2",
    title: "$75 Home Essentials Card",
    category: "Home Essentials",
    faceValueLabel: "$75",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 225,
    ticketsSold: 118,
  },
  {
    id: "placeholder-discovery-3",
    title: "$150 Kitchen Upgrade Card",
    category: "Home Essentials",
    faceValueLabel: "$150",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 450,
    ticketsSold: 203,
  },
  {
    id: "placeholder-discovery-4",
    title: "$50 Gift Card Bundle",
    category: "Gift Cards",
    faceValueLabel: "$50",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 150,
    ticketsSold: 24,
  },
  {
    id: "placeholder-discovery-5",
    title: "$100 Electronics Card",
    category: "Electronics",
    faceValueLabel: "$100",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 300,
    ticketsSold: 288,
  },
  {
    id: "placeholder-discovery-6",
    title: "$25 Movie Night Card",
    category: "Movie Night",
    faceValueLabel: "$25",
    entryPriceLabel: "$1 Entry",
    ticketCapacity: 75,
    ticketsSold: 39,
  },
];

/** Launch categories, spec §7. First entry is the default active filter. */
export const homeCategories = [
  "All",
  "Groceries & Gas",
  "Movie Night",
  "Electronics",
  "Home Essentials",
  "Gift Cards",
  "Trophy Vault",
] as const;
