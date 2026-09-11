export const popularRewardAmounts = [100, 75, 50, 25] as const;

export const popularRewardBrands = [
  { slug: "amazon", name: "Amazon", accent: "#ff9900", dark: "#131921", homeColor: "linear-gradient(145deg,#ffb11b,#ff6b00)", artFile: "amazon-card-display.png", category: "Shopping", sourceUrl: "https://www.amazon.com/gift-cards" },
  { slug: "walmart", name: "Walmart", accent: "#ffc220", dark: "#0071ce", homeColor: "linear-gradient(145deg,#1599df,#0572bd)", artFile: "walmart-card-display.png", category: "Everyday Shopping", sourceUrl: "https://www.walmart.com/cp/gift-cards/96894" },
  { slug: "starbucks", name: "Starbucks", accent: "#ffffff", dark: "#00754a", homeColor: "linear-gradient(145deg,#138f68,#006241)", artFile: "starbucks-card-final.png", category: "Dining & Coffee", sourceUrl: "https://www.starbucks.com/gift" },
  { slug: "doordash", name: "DoorDash", accent: "#ffffff", dark: "#ff3008", homeColor: "linear-gradient(145deg,#ff5a4d,#e92819)", artFile: "doordash-card-red.svg", category: "Dining & Delivery", sourceUrl: "https://www.doordash.com/gift-cards/" },
  { slug: "home-depot", name: "The Home Depot", accent: "#ffffff", dark: "#f96302", homeColor: "linear-gradient(145deg,#ff9c22,#f26822)", artFile: "home-depot-card-final.png", category: "Home Essentials", sourceUrl: "https://www.homedepot.com/c/Gift_Cards" },
  { slug: "nintendo", name: "Nintendo", accent: "#ffffff", dark: "#e60012", homeColor: "linear-gradient(145deg,#f04444,#d51625)", artFile: "nintendo.png", category: "Gaming", sourceUrl: "https://www.nintendo.com/us/retail-offers/gift-cards/" },
  { slug: "cvs", name: "CVS", accent: "#ffffff", dark: "#cc0000", homeColor: "linear-gradient(145deg,#f54b5c,#cc1634)", artFile: "cvs-card-clean.png", category: "Health & Essentials", sourceUrl: "https://www.cvs.com/shop/gift-cards" },
  { slug: "uber-eats", name: "Uber Eats", accent: "#06c167", dark: "#101010", homeColor: "linear-gradient(145deg,#37c875,#078c50)", artFile: "uber-eats-card-display.png", category: "Dining & Delivery", sourceUrl: "https://www.uber.com/us/en/gift-cards/" },
  { slug: "adidas", name: "Adidas", accent: "#ffffff", dark: "#111111", homeColor: "linear-gradient(145deg,#344961,#101820)", artFile: "adidas-card-display.png", category: "Apparel & Footwear", sourceUrl: "https://www.adidas.com/us/giftcards" },
  { slug: "petsmart", name: "PetSmart", accent: "#e31837", dark: "#0877bd", homeColor: "linear-gradient(145deg,#238ed0,#005696)", artFile: "petsmart.jpg", category: "Pet Essentials", sourceUrl: "https://www.petsmart.com/gift-cards.html" },
] as const;

export type PopularRewardBrand = (typeof popularRewardBrands)[number];

export function getPopularRewardBrand(slug: string) {
  return popularRewardBrands.find((brand) => brand.slug === slug);
}

export function popularRewardProductSlug(brandSlug: string, amount: number) {
  return `${brandSlug}-${amount}-gift-card`;
}
