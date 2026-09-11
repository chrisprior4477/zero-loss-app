/**
 * DEMO_DATA — must be replaced with real Tillo/fulfillment data before launch.
 *
 * This is the single source for the desktop Live Pulse ticker and transparency
 * stats pod. Keeping the values here prevents sample marketplace claims from
 * becoming buried in presentation components.
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
  { label: "AirPod Pros", value: "Only 2 left", tone: "urgent" },
  { label: "Popular Publix gift card", value: "$100", tone: "live" },
  { label: "Dunkin' Donuts $25 card", value: "97% full", tone: "neutral" },
  { label: "Nintendo Switch", value: "6 tickets left", tone: "danger" },
  { label: "Darden Restaurants $100 gift card", value: "42 tickets left", tone: "urgent" },
  { label: "193 winners", value: "TODAY!", tone: "live" },
  { label: "Grocery reward", value: "11 entries left", tone: "urgent" },
  { label: "Active prize pools", value: "142", tone: "neutral" },
] as const;

export const transparencyStatsDemo = [
  {
    label: "Rewards fulfilled",
    value: "$1,248,650",
    detail: "Recorded fulfillment value",
  },
  {
    label: "Verified winners",
    value: "18,402",
    detail: "Completed award records",
  },
  {
    label: "Credits returned",
    value: "$386,940",
    detail: "Purchase value preserved",
  },
  {
    label: "Active prize pools",
    value: "142",
    detail: "Open marketplace opportunities",
  },
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

export const recentWinnerDemoItems = [
  {
    name: "Tracy S.",
    reward: 'a Samsung 50" smart TV',
    avatar: "/design/lady-with-bag.webp",
    href: "/items/samsung-m70h-tv",
  },
  {
    name: "Tim M.",
    reward: "a $100 Walmart gift card",
    avatar: "/design/buyer-mobile.webp",
    href: "/items/publix-100-gift-card",
  },
  {
    name: "Jordan R.",
    reward: "a PlayStation 5 Slim",
    avatar: "/how-it-works-journey-winner.png",
    href: "/items/playstation-5-slim",
  },
  {
    name: "Maya L.",
    reward: "Nike Court Shot shoes",
    avatar: "/how-it-works-clear-win.png",
    href: "/items/nike-court-shot-shoes",
  },
] as const;

export const socialActivityDemoItems = [
  {
    id: "social-x-1",
    platform: "x",
    initials: "TS",
    name: "Tracy S.",
    handle: "@tracyshops",
    avatar: "/design/lady-with-bag.webp",
    message: "That Samsung 50-inch smart TV is officially mine. Movie night just got a major upgrade!",
    accent: "#05bdf6",
    href: "/items/samsung-m70h-tv",
  },
  {
    id: "social-facebook-1",
    platform: "facebook",
    initials: "TM",
    name: "Tim M.",
    handle: "Facebook",
    avatar: "/design/buyer-mobile.webp",
    message: "My $100 Walmart shopping reward arrived today. Zero Loss made my week!",
    accent: "#1877f2",
    href: "/browse?view=winners",
  },
  {
    id: "social-instagram-1",
    platform: "instagram",
    initials: "JL",
    name: "Jordan L.",
    handle: "@jordanplays",
    avatar: "/how-it-works-journey-winner.png",
    message: "Unboxed my PlayStation 5 Slim today. This setup is unreal!",
    accent: "#d946ef",
    href: "/items/playstation-5-slim",
  },
  {
    id: "social-x-2",
    platform: "x",
    initials: "MR",
    name: "Maya R.",
    handle: "@mayarewards",
    avatar: "/how-it-works-clear-win.png",
    message: "One dollar, one seriously clean pair of Nike Court Shot shoes. They fit perfectly!",
    accent: "#05bdf6",
    href: "/items/nike-court-shot-shoes",
  },
  {
    id: "social-tiktok-1",
    platform: "tiktok",
    initials: "AK",
    name: "Alex K.",
    handle: "@alexunboxes",
    avatar: "/how-it-works-journey-reclaim.png",
    message: "Come unbox the Baby's Essentials Bundle I won. This is the most practical prize ever!",
    accent: "#111827",
    href: "/items/babys-essentials-bundle",
  },
  {
    id: "social-facebook-2",
    platform: "facebook",
    initials: "CB",
    name: "Chris B.",
    handle: "Facebook",
    avatar: "/how-it-works-clear-fallback.png",
    message: "The new television is finally on the wall. Movie night just got a major upgrade!",
    accent: "#1877f2",
    href: "/items/lg-oled-c6-65-tv",
  },
  {
    id: "social-instagram-2",
    platform: "instagram",
    initials: "NS",
    name: "Nicole S.",
    handle: "@nicoleathome",
    avatar: "/design/lady-with-bag.webp",
    message: "Swipe to see the home refresh kit completely transform my kitchen counter.",
    accent: "#d946ef",
    href: "/items/dyson-v8-cordless-vacuum",
  },
  {
    id: "social-tiktok-2",
    platform: "tiktok",
    initials: "DP",
    name: "Devon P.",
    handle: "@devontriesit",
    avatar: "/design/buyer-mobile.webp",
    message: "Testing my new premium headphones on a flight—now I understand the hype.",
    accent: "#111827",
    href: "/browse?view=winners",
  },
] as const;
