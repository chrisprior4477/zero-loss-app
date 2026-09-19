/**
 * DEMO_DATA — must be replaced with real Tillo/fulfillment data before launch.
 *
 * Preview catalog highlights live here so sample marketplace data stays out of
 * presentation components. Do not present this content as live activity.
 */
export const repeatedHomepageProducts = {
  tv: {
    title: 'Samsung 50" M70H Smart TV',
    retailer: "Best Buy",
    prizeValue: 400,
    entryCapacity: 1200,
    entriesSold: 1199,
  },
  shoes: {
    title: "Nike Men's Court Shot Shoes",
    retailer: "Dick's Sporting Goods",
    prizeValue: 75,
    entryCapacity: 225,
    entriesSold: 224,
  },
  babyEssentials: {
    title: "Baby's Essentials Bundle",
    retailer: "Walmart",
    prizeValue: 100,
    entryCapacity: 300,
    entriesSold: 299,
  },
} as const;

function percentFilled(entriesSold: number, entryCapacity: number) {
  return Math.floor((entriesSold / entryCapacity) * 100);
}

export const livePulseDemoItems = [
  { label: repeatedHomepageProducts.tv.title, value: repeatedHomepageProducts.tv.retailer, tone: "neutral" },
  { label: repeatedHomepageProducts.shoes.title, value: repeatedHomepageProducts.shoes.retailer, tone: "urgent" },
  { label: repeatedHomepageProducts.babyEssentials.title, value: repeatedHomepageProducts.babyEssentials.retailer, tone: "live" },
] as const;

export const dollarChoiceDemoItems = [
  {
    id: "dollar-tv",
    title: repeatedHomepageProducts.tv.title,
    image: "/catalog/samsung-m70h-tv-real.png",
    href: "/items/samsung-m70h-tv",
    accent: "#8b5cf6",
    accentSoft: "rgba(139,92,246,0.34)",
    percentFilled: percentFilled(repeatedHomepageProducts.tv.entriesSold, repeatedHomepageProducts.tv.entryCapacity),
    prizeValue: repeatedHomepageProducts.tv.prizeValue,
    endingSoon: true,
  },
  {
    id: "dollar-shoes",
    title: repeatedHomepageProducts.shoes.title,
    image: "/catalog/nike-court-shot-side-cutout.png",
    href: "/items/nike-court-shot-shoes",
    accent: "#ff7a22",
    accentSoft: "rgba(255,122,34,0.32)",
    percentFilled: percentFilled(repeatedHomepageProducts.shoes.entriesSold, repeatedHomepageProducts.shoes.entryCapacity),
    prizeValue: repeatedHomepageProducts.shoes.prizeValue,
    endingSoon: true,
  },
  {
    id: "dollar-baby-essentials",
    title: repeatedHomepageProducts.babyEssentials.title,
    image: "/catalog/babys-essentials-bundle-angled-real.png",
    href: "/items/babys-essentials-bundle",
    accent: "#31e800",
    accentSoft: "rgba(49,232,0,0.28)",
    percentFilled: percentFilled(repeatedHomepageProducts.babyEssentials.entriesSold, repeatedHomepageProducts.babyEssentials.entryCapacity),
    prizeValue: repeatedHomepageProducts.babyEssentials.prizeValue,
    endingSoon: true,
  },
  {
    id: "dollar-gaming",
    title: "PlayStation 5 Slim Model",
    image: "/dollar-choice-gaming.png",
    href: "/items/playstation-5-slim",
    accent: "#00b9ff",
    accentSoft: "rgba(0,185,255,0.34)",
    percentFilled: 68,
    prizeValue: 650,
    endingSoon: false,
  },
  {
    id: "dollar-gift-card",
    title: "$100 Publix Gift Card",
    image: "/catalog/publix-100-gift-card-cutout-final.png",
    href: "/items/publix-100-gift-card",
    accent: "#c946ff",
    accentSoft: "rgba(201,70,255,0.32)",
    percentFilled: 41,
    prizeValue: 100,
    endingSoon: false,
  },
  {
    id: "dollar-home",
    title: "Dyson V8 Cordless Pet Vacuum",
    image: "/catalog/dyson-v8-diagonal-real.png",
    href: "/items/dyson-v8-cordless-vacuum",
    accent: "#ff3f8e",
    accentSoft: "rgba(255,63,142,0.28)",
    percentFilled: 34,
    prizeValue: 350,
    endingSoon: false,
  },
  {
    id: "dollar-lg-oled-c6",
    title: '65-inch LG OLED evo AI C6 4K Smart TV',
    image: "/dollar-choice-lg-oled-c6.png",
    href: "/items/lg-oled-c6-65-tv",
    accent: "#7cff22",
    accentSoft: "rgba(124,255,34,0.3)",
    percentFilled: 29,
    prizeValue: 2700,
    endingSoon: false,
  },
] as const;

export function entryCapacityForValue(prizeValue: number) {
  return prizeValue * 3;
}

export const marketplaceMovementDemoItems = [
  { itemId: "dollar-tv", spotsLeft: repeatedHomepageProducts.tv.entryCapacity - repeatedHomepageProducts.tv.entriesSold },
  { itemId: "dollar-shoes", spotsLeft: repeatedHomepageProducts.shoes.entryCapacity - repeatedHomepageProducts.shoes.entriesSold },
  { itemId: "dollar-gaming", spotsLeft: 624 },
  { itemId: "dollar-baby-essentials", spotsLeft: repeatedHomepageProducts.babyEssentials.entryCapacity - repeatedHomepageProducts.babyEssentials.entriesSold },
  { itemId: "dollar-gift-card", spotsLeft: 177 },
] as const;
