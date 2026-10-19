import type { DemoProduct } from "./demo-products";
import artwork from "./partner-card-art.json";
import { giftCardPartnerGroups } from "./gift-card-partners";

const retailerKey = (name: string) => name.normalize("NFKD").toLowerCase().replace(/[®™’']/g, "").replace(/[^a-z0-9]+/g, "");
const slugKey = (name: string) => name.replace(/[®™]/g, "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const planBrands = new Set(["XBOX Game Pass Essential", "XBOX Game Pass Ultimate", "Microsoft Office 365 Home", "GCodes® AT&T Prepaid Plans", "BarkBox"]);

function stableOrder(value: string) {
  let hash = 2166136261;
  for (const letter of value) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
  return hash;
}

export type DirectoryDemoScenario = {
  product: DemoProduct;
  bucket: "one-left" | "two-left" | "eight-left" | "mid-fill";
  closingOutcome: "winner" | "purchase_option";
};

/** Append-only demo additions. Existing $100 cards and retailer identities win. */
export function buildDirectoryRewards(existing: readonly DemoProduct[]): DirectoryDemoScenario[] {
  const categories = new Map(giftCardPartnerGroups.filter(group => group.category !== "Cryptocurrency")
    .flatMap(group => group.brands.map(brand => [brand, group.category] as const)));
  const candidates = artwork.filter(art => !existing.some(product =>
    retailerKey(product.retailer) === retailerKey(art.name) && product.value === 100 && /gift[ -]?card/i.test(product.title)))
    .sort((a, b) => stableOrder(a.name) - stableOrder(b.name) || a.name.localeCompare(b.name));
  return candidates.map((art, index) => {
    const retailer = existing.find(product => retailerKey(product.retailer) === retailerKey(art.name))?.retailer ?? art.name;
    const brand = art.name === "Ube" ? "Uber" : retailer;
    const isPlan = planBrands.has(art.name);
    const bucketIndex = index % 4;
    const sold = [299, 298, 292, 135 + (stableOrder(art.name + "fill") % 61)][bucketIndex];
    let category = categories.get(art.name) ?? "Entertainment";
    if (category === "Grocery, Convenience, Pharmacy & Gas") {
      category = ["BP", "Pilot Flying J", "Sheetz", "Speedway"].includes(art.name) ? "Fuel & Convenience"
        : ["CVS®", "Walgreens"].includes(art.name) ? "Health & Essentials" : "Groceries";
    }
    const note = isPlan
      ? "Simulated $100 demo value only. Authentic subscription/plan artwork may show a different term or amount; this is not an available $100 retail denomination or a redeemable card."
      : "Simulated investor-demo offer only, not a redeemable gift card. Authentic provider artwork is illustrative; the $100 denomination, fulfillment and artwork authorization require confirmation before a live launch.";
    return {
      bucket: (["one-left", "two-left", "eight-left", "mid-fill"] as const)[bucketIndex],
      // Alternate within each occupancy bucket, not by category or alphabetical order.
      closingOutcome: (Math.floor(index / 4) + bucketIndex) % 2 === 0 ? "winner" : "purchase_option",
      product: {
        slug: `directory-${slugKey(art.name)}-100-gift-card`,
        title: isPlan ? `$100 ${brand} Demo Reward` : `$100 ${brand} Gift Card`,
        brand, retailer, category, value: 100, entryPrice: 1, capacity: 300, sold,
        summary: `A simulated $100 ${brand} ${isPlan ? "subscription/plan reward" : "gift-card offer"} for trying the marketplace. No real purchase or fulfillment is available in this demo.`,
        gallery: [{ src: art.image, alt: `${brand} ${isPlan ? "subscription/plan" : "gift-card"} artwork`, fit: "contain" }],
        highlights: ["$100 simulated demo value", "Authentic brand/provider artwork", "Demo entries only; no real payment or fulfillment"],
        specifications: [{ label: "Demo value", value: "$100 (simulated)" }, { label: "Retailer", value: brand },
          { label: "Status", value: "Investor demo; not redeemable" },
          ...(isPlan ? [{ label: "Artwork", value: "Actual subscription/plan card; pictured term is not a $100 denomination" }] : [])],
        included: [`One simulated $100 ${brand} demo reward; no real redemption code`],
        sourceUrl: art.sourceUrl, sourceLabel: "Original gift-card artwork and provider information", note,
      },
    };
  });
}
