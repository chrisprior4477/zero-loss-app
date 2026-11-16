export type CampaignKey = "products" | "fulfillment" | "campaign" | "other" | "restaurant" | "tools";

export function businessCampaignDestination(key: CampaignKey) {
  switch (key) {
    case "products": return "harbor-coffee";
    case "fulfillment": return "northstar-rewards";
    case "campaign": return "trailbound-adventures";
    case "other": return "build-with-maya";
    case "restaurant": return "bellamora";
    case "tools": return "forge-field";
  }
}

export const businessCampaigns: Record<CampaignKey, { brand: string; title: string; reward: string; value: string; original: string; generated: string }> = {
  products: { brand: "HARBOR COFFEE", title: "Win a better morning.", reward: "Coffee Explorer Collection and one year of remarkable coffee", value: "$249", original: "harbor-coffee-board.png", generated: "harbor-coffee-campaign.png" },
  fulfillment: { brand: "NORTHSTAR REWARDS", title: "A reward made for you.", reward: "$150 dining, travel, shopping, or entertainment reward", value: "$150", original: "northstar-rewards-board.png", generated: "northstar-rewards-campaign.png" },
  campaign: { brand: "TRAILBOUND ADVENTURES", title: "Trade the routine for the ridgeline.", reward: "A mountain escape, guided trail day, and outdoor gear for four", value: "$1,200", original: "trailbound-adventures-board.png", generated: "trailbound-adventures-campaign.png" },
  other: { brand: "BUILD WITH MAYA", title: "Build the setup you actually want.", reward: "A creator-curated performance PC and complete desk package", value: "$2,499", original: "maya-chen-creator-board.png", generated: "maya-chen-creator-campaign.png" },
  restaurant: { brand: "BELLAMORA ITALIAN KITCHEN", title: "Dinner is on us.", reward: "A memorable Italian dinner for two with a $150 dining gift card", value: "$150", original: "bellamora-originals.png", generated: "bellamora-campaign.png" },
  tools: { brand: "FORGE & FIELD SUPPLY", title: "Build more. Spend less.", reward: "Professional tools and jobsite equipment from a ten-listing launch catalog", value: "$299", original: "forge-field-originals.png", generated: "forge-field-campaign.png" },
};
