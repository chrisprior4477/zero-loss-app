/**
 * DEMO_DATA — must be replaced with real Tillo/fulfillment data before launch.
 *
 * This is the single source for the desktop Live Pulse ticker and transparency
 * stats pod. Keeping the values here prevents sample marketplace claims from
 * becoming buried in presentation components.
 */
export const livePulseDemoItems = [
  { label: "AirPods pool", value: "94% filled", tone: "urgent" },
  { label: "Home essentials drop", value: "18 entries left", tone: "urgent" },
  { label: "Reward credit issued", value: "$25.00", tone: "live" },
  { label: "Gaming bundle", value: "closes in 08:42", tone: "neutral" },
  { label: "Coffee reward", value: "72% filled", tone: "neutral" },
  { label: "Fulfillment batch", value: "38 orders verified", tone: "live" },
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
    id: "dollar-headphones",
    title: "Noise-cancelling headphones",
    image: "/dollar-choice-headphones.png",
    href: "/browse",
    accent: "#8b5cf6",
    accentSoft: "rgba(139,92,246,0.34)",
    percentFilled: 72,
    timeRemaining: "12m",
  },
  {
    id: "dollar-espresso",
    title: "Dual-boiler espresso machine",
    image: "/dollar-choice-espresso.png",
    href: "/browse",
    accent: "#ff7a22",
    accentSoft: "rgba(255,122,34,0.32)",
    percentFilled: 88,
    timeRemaining: "45m",
  },
  {
    id: "dollar-gaming",
    title: "Next-gen gaming bundle",
    image: "/dollar-choice-gaming.png",
    href: "/browse",
    accent: "#00b9ff",
    accentSoft: "rgba(0,185,255,0.34)",
    percentFilled: 68,
    timeRemaining: "2h 22m",
  },
  {
    id: "dollar-bike",
    title: "Carbon-frame road bike",
    image: "/dollar-choice-bike-v2.png",
    href: "/browse",
    accent: "#31e800",
    accentSoft: "rgba(49,232,0,0.28)",
    percentFilled: 56,
    timeRemaining: "3h 7m",
  },
  {
    id: "dollar-gift-card",
    title: "$100 shopping reward",
    image: "/dollar-choice-reward-v2.png",
    href: "/browse",
    accent: "#c946ff",
    accentSoft: "rgba(201,70,255,0.32)",
    percentFilled: 41,
    timeRemaining: "4h 15m",
  },
  {
    id: "dollar-home",
    title: "Premium home refresh kit",
    image: "/dollar-choice-home-v2.png",
    href: "/browse",
    accent: "#ff3f8e",
    accentSoft: "rgba(255,63,142,0.28)",
    percentFilled: 34,
    timeRemaining: "6h 40m",
  },
  {
    id: "dollar-lg-oled-c6",
    title: '65-inch LG OLED evo AI C6 4K Smart TV',
    image: "/dollar-choice-lg-oled-c6.png",
    href: "https://www.lg.com/us/tvs/lg-oled65c6pua-oled-4k-tv",
    accent: "#7cff22",
    accentSoft: "rgba(124,255,34,0.3)",
    percentFilled: 29,
    timeRemaining: "8h 25m",
  },
] as const;

export const marketplaceMovementDemoItems = [
  { itemId: "dollar-headphones", spotsLeft: 183 },
  { itemId: "dollar-espresso", spotsLeft: 221 },
  { itemId: "dollar-gaming", spotsLeft: 456 },
  { itemId: "dollar-bike", spotsLeft: 678 },
  { itemId: "dollar-gift-card", spotsLeft: 1203 },
] as const;

export const recentWinnerDemoItems = [
  {
    name: "Tracy S.",
    reward: "a dual-boiler espresso maker",
    avatar: "/design/lady-with-bag.webp",
    href: "/browse",
  },
  {
    name: "Tim M.",
    reward: "a $100 Walmart gift card",
    avatar: "/design/buyer-mobile.webp",
    href: "/browse",
  },
  {
    name: "Jordan R.",
    reward: "a next-gen gaming bundle",
    avatar: "/how-it-works-journey-winner.png",
    href: "/browse",
  },
  {
    name: "Maya L.",
    reward: "noise-cancelling headphones",
    avatar: "/how-it-works-clear-win.png",
    href: "/browse",
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
    message: "That dual-boiler espresso maker is officially mine. My first coffee tasted like a victory!",
    accent: "#05bdf6",
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
  },
  {
    id: "social-instagram-1",
    platform: "instagram",
    initials: "JL",
    name: "Jordan L.",
    handle: "@jordanplays",
    avatar: "/how-it-works-journey-winner.png",
    message: "Unboxed my next-gen gaming bundle today—console, controller, and headset. This setup is unreal!",
    accent: "#d946ef",
  },
  {
    id: "social-x-2",
    platform: "x",
    initials: "MR",
    name: "Maya R.",
    handle: "@mayarewards",
    avatar: "/how-it-works-clear-win.png",
    message: "One dollar, one seriously good pair of noise-cancelling headphones. They sound incredible!",
    accent: "#05bdf6",
  },
  {
    id: "social-tiktok-1",
    platform: "tiktok",
    initials: "AK",
    name: "Alex K.",
    handle: "@alexunboxes",
    avatar: "/how-it-works-journey-reclaim.png",
    message: "Come unbox the carbon-frame road bike I won with me. The color is even better in person!",
    accent: "#111827",
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
  },
] as const;
