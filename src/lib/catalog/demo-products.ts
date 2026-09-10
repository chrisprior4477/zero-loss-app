export type DemoProduct = {
  slug: string;
  title: string;
  brand: string;
  retailer: string;
  category: string;
  value: number;
  entryPrice: number;
  capacity: number;
  sold: number;
  summary: string;
  gallery: { src: string; alt: string; fit?: "contain" | "cover" }[];
  highlights: string[];
  specifications: { label: string; value: string }[];
  included: string[];
  sourceUrl: string;
  sourceLabel: string;
  note?: string;
};

export const demoProducts: DemoProduct[] = [
  {
    slug: "samsung-m70h-tv",
    title: 'Samsung 50" M70H Mini LED 4K Smart TV',
    brand: "Samsung",
    retailer: "Best Buy",
    category: "Electronics",
    value: 400,
    entryPrice: 1,
    capacity: 1200,
    sold: 1199,
    summary:
      "A 50-inch Mini LED 4K smart TV with Samsung's M70H picture platform, 4K upscaling, Pure Spectrum Color, and built-in streaming through Tizen.",
    gallery: [
      { src: "/catalog/samsung-m70h-tv-real.png", alt: "Samsung M70H television, front view" },
      { src: "/catalog/gallery/samsung-front.jpg", alt: "Samsung M70H television product view", fit: "contain" },
    ],
    highlights: [
      "Mini LED Processor 4K",
      "Pure Spectrum Color and 4K upscaling",
      "Samsung Tizen smart TV platform",
      "Motion Xcelerator and Soccer Mode",
    ],
    specifications: [
      { label: "Model", value: "UN50M70HAFXZA" },
      { label: "Screen size", value: "50 inches" },
      { label: "Resolution", value: "4K UHD" },
      { label: "With stand", value: '43.73 W × 27.40 H × 7.83 D in' },
      { label: "Without stand", value: '43.73 W × 25.35 H × 3.01 D in' },
      { label: "VESA mount", value: "200 × 200 mm" },
      { label: "Weight", value: "19.4 lb with stand; 18.7 lb without" },
    ],
    included: ["50-inch television", "Basic feet/stand", "Remote control", "Power cable"],
    sourceUrl: "https://www.samsung.com/us/tvs/mini-led-tv/50-inch-mini-led-4k-tv-m70h-sku-un50m70hafxza/",
    sourceLabel: "Samsung product information",
  },
  {
    slug: "nike-court-shot-shoes",
    title: "Nike Men's Court Shot Shoes",
    brand: "Nike",
    retailer: "Dick's Sporting Goods",
    category: "Shoes & Apparel",
    value: 75,
    entryPrice: 1,
    capacity: 225,
    sold: 224,
    summary:
      "A clean, low-profile men's court sneaker with a synthetic-leather upper, mesh lining, and a durable rubber outsole.",
    gallery: [
      { src: "/catalog/nike-court-shot-side-cutout.png", alt: "Nike Court Shot shoe, side view" },
      { src: "/catalog/gallery/nike-top.jpg", alt: "Nike Court Shot shoes, top view", fit: "contain" },
      { src: "/catalog/gallery/nike-side-original.jpg", alt: "Nike Court Shot shoe product view", fit: "contain" },
    ],
    highlights: [
      "Synthetic-leather upper",
      "Breathable mesh lining",
      "Padded collar and tongue",
      "Durable rubber outsole",
    ],
    specifications: [
      { label: "Style", value: "FQ8146-110" },
      { label: "Color", value: "White / Glacier Ice" },
      { label: "Department", value: "Men's" },
      { label: "Width", value: "Standard / medium" },
      { label: "Closure", value: "Lace-up" },
      { label: "Sizing", value: "Choose an available men's size during completion" },
    ],
    included: ["One pair of Nike Court Shot shoes"],
    sourceUrl: "https://www.dickssportinggoods.com/p/nike-mens-court-shot-shoes-24nikmcrtshtwhtblmns/24nikmcrtshtwhtblmns",
    sourceLabel: "Dick's Sporting Goods product information",
    note: "Size and color availability would be confirmed at fulfillment.",
  },
  {
    slug: "babys-essentials-bundle",
    title: "Baby's Essentials Bundle",
    brand: "Pampers + Enfamil",
    retailer: "Walmart",
    category: "Baby Essentials",
    value: 100,
    entryPrice: 1,
    capacity: 300,
    sold: 299,
    summary:
      "A practical two-piece baby-care bundle with Pampers Swaddlers Size 3 diapers and Enfamil NeuroPro infant formula.",
    gallery: [
      { src: "/catalog/babys-essentials-bundle-angled-real.png", alt: "Pampers and Enfamil baby essentials bundle" },
      { src: "/catalog/gallery/pampers-swaddlers.jpg", alt: "Pampers Swaddlers Size 3 diaper package", fit: "contain" },
      { src: "/catalog/gallery/enfamil-neuropro.jpg", alt: "Enfamil NeuroPro 28.3 ounce formula can", fit: "contain" },
    ],
    highlights: [
      "Pampers Swaddlers Size 3, 78-count pack",
      "Designed for babies approximately 16–28 lb",
      "Enfamil NeuroPro infant formula, 28.3 oz powder can",
      "Formula makes approximately 45 four-fluid-ounce bottles",
    ],
    specifications: [
      { label: "Diapers", value: "Pampers Swaddlers, Size 3, 78 count" },
      { label: "Diaper weight range", value: "Approximately 16–28 lb" },
      { label: "Formula", value: "Enfamil NeuroPro Infant, powder" },
      { label: "Formula size", value: "28.3 oz can" },
      { label: "Intended age", value: "Infants 0–12 months" },
      { label: "Bundle pieces", value: "2" },
    ],
    included: ["One Pampers Swaddlers Size 3 package", "One Enfamil NeuroPro 28.3 oz can"],
    sourceUrl: "https://www.walmart.com/ip/280394679",
    sourceLabel: "Walmart product information",
    note: "Exact packaging may vary. Formula choice should always follow a caregiver's and pediatrician's guidance.",
  },
  {
    slug: "playstation-5-slim",
    title: "PlayStation 5 Slim Model",
    brand: "Sony PlayStation",
    retailer: "Best Buy",
    category: "Gaming",
    value: 650,
    entryPrice: 1,
    capacity: 1950,
    sold: 1326,
    summary: "The slimmer PlayStation 5 console with a 1 TB SSD, Ultra HD Blu-ray disc drive, and one DualSense wireless controller.",
    gallery: [{ src: "/dollar-choice-gaming.png", alt: "PlayStation 5 Slim console with DualSense controller" }],
    highlights: ["1 TB built-in SSD", "Ultra HD Blu-ray disc drive", "4K gaming and ray-tracing support", "DualSense haptic feedback and adaptive triggers"],
    specifications: [
      { label: "Model group", value: "CFI-2000 series (Slim)" },
      { label: "Storage", value: "1 TB SSD" },
      { label: "Console dimensions", value: "Approx. 14.1 × 3.8 × 8.5 in" },
      { label: "Optical drive", value: "Ultra HD Blu-ray" },
      { label: "Video output", value: "Up to 4K" },
      { label: "Controller", value: "DualSense wireless controller" },
    ],
    included: ["PlayStation 5 Slim console", "DualSense wireless controller", "Horizontal stand feet", "HDMI and power cables"],
    sourceUrl: "https://direct.playstation.com/en-us/hardware/ps5/",
    sourceLabel: "PlayStation product information",
  },
  {
    slug: "publix-100-gift-card",
    title: "$100 Publix Gift Card",
    brand: "Publix",
    retailer: "Publix",
    category: "Groceries",
    value: 100,
    entryPrice: 1,
    capacity: 300,
    sold: 123,
    summary: "A $100 Publix gift card for eligible purchases at Publix stores, with no card fees and no expiration date under Publix's current gift-card policy.",
    gallery: [{ src: "/catalog/publix-100-gift-card-cutout-final.png", alt: "$100 Publix gift card" }],
    highlights: ["$100 card value", "Use at Publix stores", "No gift-card fees", "No expiration date under current Publix policy"],
    specifications: [
      { label: "Card value", value: "$100" },
      { label: "Retailer", value: "Publix" },
      { label: "Format", value: "Physical or digital fulfillment, subject to provider support" },
      { label: "Expiration", value: "Does not expire" },
      { label: "Fees", value: "None" },
    ],
    included: ["One $100 Publix gift card"],
    sourceUrl: "https://www.publix.com/gift-cards",
    sourceLabel: "Publix gift-card information",
    note: "Final card format and delivery method require provider confirmation.",
  },
  {
    slug: "dyson-v8-cordless-vacuum",
    title: "Dyson V8 Cordless Pet Vacuum",
    brand: "Dyson",
    retailer: "Lowe's",
    category: "Home Essentials",
    value: 350,
    entryPrice: 1,
    capacity: 1050,
    sold: 357,
    summary: "A lightweight cordless Dyson designed for carpets, hard floors, upholstery, and homes with pets, with handheld conversion and up to 40 minutes of runtime.",
    gallery: [{ src: "/catalog/dyson-v8-diagonal-real.png", alt: "Dyson V8 cordless pet vacuum" }],
    highlights: ["Up to 40 minutes of cordless runtime", "De-tangling Motorbar cleaner head", "Converts to a handheld vacuum", "Whole-machine filtration"],
    specifications: [
      { label: "Retail model", value: "400473-01" },
      { label: "Type", value: "Cordless stick / handheld" },
      { label: "Runtime", value: "Up to 40 minutes" },
      { label: "Floor types", value: "Carpet and hard floor" },
      { label: "Warranty", value: "2-year limited" },
      { label: "Pet hair", value: "Yes" },
    ],
    included: ["Dyson V8 vacuum", "Motorbar cleaner head", "Combination and crevice tools", "Hair screw tool", "Wall dock and charger"],
    sourceUrl: "https://www.lowes.com/pd/Dyson-V8-Cordless-Pet-Stick-Vacuum-Convertible-To-Handheld/5014724781",
    sourceLabel: "Lowe's product information",
  },
  {
    slug: "lg-oled-c6-65-tv",
    title: "65-inch LG OLED evo AI C6 4K Smart TV",
    brand: "LG",
    retailer: "Best Buy",
    category: "Electronics",
    value: 2700,
    entryPrice: 1,
    capacity: 8100,
    sold: 2349,
    summary: "A 65-inch OLED evo television with self-lit 4K pixels, the Alpha 11 AI Processor Gen3, Dolby Vision and Atmos, and gaming support up to 165 Hz VRR.",
    gallery: [{ src: "/dollar-choice-lg-oled-c6.png", alt: "LG 65-inch OLED evo C6 television" }],
    highlights: ["Over 8.3 million self-lit OLED pixels", "Alpha 11 AI Processor Gen3", "Dolby Vision, Dolby Atmos, and Filmmaker Mode", "Up to 165 Hz VRR with G-Sync and FreeSync Premium"],
    specifications: [
      { label: "Model", value: "OLED65C6PUA" },
      { label: "Screen size", value: "65 inches" },
      { label: "Resolution", value: "4K OLED" },
      { label: "With stand", value: "56.7 W × 34.6 H × 9.1 D in" },
      { label: "Without stand", value: "56.7 W × 32.5 H × 1.8 D in" },
      { label: "VESA mount", value: "300 × 200 mm" },
      { label: "Weight", value: "40.6 lb with stand" },
    ],
    included: ["65-inch LG OLED television", "AI Magic Remote", "Tabletop stand", "Attached power cable"],
    sourceUrl: "https://www.lg.com/us/tvs/lg-oled65c6pua-oled-4k-tv",
    sourceLabel: "LG product information",
    note: "Displayed as supplied through Best Buy for this private catalog demo; retailer availability requires final confirmation.",
  },
];

export function getDemoProduct(slug: string) {
  return demoProducts.find((product) => product.slug === slug);
}
