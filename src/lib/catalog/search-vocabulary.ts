import { giftCardPartnerGroups } from "./gift-card-partners";

// Search-owned discovery metadata, not inventory or redemption guarantees.
// Apply retailer terms only to existing gift-card offerings, not all products
// sold by that retailer. Keep additions specific and regression-tested.
export const productSearchTerms: Readonly<Record<string, string>> = {
  "babys-essentials-bundle": "baby infant newborn diaper formula baby supplies",
  "nike-court-shot-shoes": "sneaker trainer tennis shoe footwear",
};

export const retailerSearchTerms: Readonly<Record<string, string>> = {
  "The Home Depot": "tool power tool hand tool reciprocating saw sawzall drill screwdriver hammer hardware lumber paint garden gardening home improvement repair renovation",
  PetSmart: "pet dog puppy cat kitten food treat kibble pet supply pet toy cat litter aquarium fish bird grooming",
  Walmart: "baby infant newborn diaper formula baby supply grocery groceries food household cleaning school supply paper towel tissue napkin medicine medication otc over the counter cold allergy pain reliever pharmacy first aid tv television electronics laptop computer tablet headphones auto automotive car tire oil battery",
  CVS: "baby diaper formula personal care toiletries shampoo toothpaste health beauty skincare paper towel tissue medicine medication otc over the counter cold allergy pain reliever pharmacy first aid",
  Publix: "grocery groceries food household cleaning paper towel tissue napkin baby infant diaper formula baby supply",
  "Best Buy": "electronics tv television home theater audio speaker headphone laptop computer tablet camera appliance video game gaming console controller",
  Crutchfield: "electronics tv television home theater audio speaker headphone car stereo",
  "P.C. Richard and Son": "electronics tv television home theater audio appliance refrigerator washer dryer",
  AutoZone: "auto automotive car truck vehicle replacement repair parts accessory spark plug ignition coil brake pad rotor caliper oil motor engine battery charger cable terminal jump starter alternator fuse bulb headlight taillight windshield wiper blade air cabin fuel filter antifreeze coolant radiator thermostat belt hose shock strut suspension steering sensor exhaust muffler transmission fluid gasket socket wrench jack diagnostic obd2 scanner car wash wax cleaning",
  "Jiffy Lube": "auto automotive car truck vehicle maintenance repair replacement oil change service motor engine battery cable terminal spark plug ignition tune up brake pad rotor fluid tire rotation alignment windshield wiper blade headlight bulb air cabin fuel filter coolant radiator hose serpentine belt transmission inspection",
  Turo: "auto automotive car vehicle rental travel",
  Adidas: "shoe sneaker trainer footwear sportswear athletic clothing workout running",
  Nintendo: "video game gaming console switch controller",
  Starbucks: "coffee cafe latte espresso tea drink",
  "Dunkin'": "coffee cafe latte espresso donut doughnut breakfast",
  DoorDash: "meal restaurant food delivery takeout takeaway dinner lunch breakfast",
  "Uber Eats": "meal restaurant food delivery takeout takeaway dinner lunch breakfast",
};

// Equivalent words only: a named brand must not become a different brand.
export const searchSynonyms: readonly (readonly string[])[] = [
  ["tv", "television"],
  ["shoe", "sneaker", "footwear", "trainer"],
  ["gas", "gasoline", "petrol"],
  ["coffee", "cafe"],
  ["grocery", "groceries"],
  ["game", "gaming"],
  ["playstation", "ps5"],
  ["baby", "infant", "newborn"],
  ["vacuum", "hoover"],
  ["electronic", "tech", "technology"],
  ["diaper", "nappy", "nappies"],
  ["treat", "snack"],
  ["medicine", "medication", "meds"],
  ["auto", "automotive", "car", "vehicle"],
  ["kids", "kid", "children", "child"],
  ["clothing", "clothes", "apparel"],
  ["furniture", "furnishings"],
  ["restaurant", "dining"],
  ["computer", "pc"],
  ["battery", "batteries"],
  ["tire", "tyre"],
  ["windshield", "windscreen"],
  ["coolant", "antifreeze"],
  ["sofa", "couch"],
  ["refrigerator", "fridge"],
];

// Reusable product families avoid maintaining every plural, typo or phrase for
// each merchant. These are discovery departments, never live stock claims.
const retailerAssortments = [
  { retailers: ["PetSmart", "Petco", "Chewy", "1-800-PetSupplies.com"], terms: "pet dog puppy cat kitten food treat kibble supply toy litter aquarium fish bird grooming collar leash bed crate bowl" },
  { retailers: ["The Home Depot", "Lowe’s", "Menards", "Ace Hardware"], terms: "home improvement hardware tool power hand reciprocating saw drill screwdriver hammer socket wrench lumber paint brush roller garden gardening hose fertilizer plumbing faucet pipe electrical outlet lighting bulb repair renovation" },
  { retailers: ["CVS", "Walgreens", "Walmart"], terms: "medicine medication otc over the counter cold allergy pain reliever pharmacy first aid bandage vitamin supplement shampoo toothpaste deodorant soap sunscreen" },
  { retailers: ["Wayfair", "IKEA", "Pottery Barn", "west elm", "CB2", "Crate & Barrel", "Bed Bath & Beyond"], terms: "home furniture furnishings sofa couch chair table desk bedroom bed mattress dresser bookcase shelf shelving dining living room rug lamp decor storage" },
  { retailers: ["Staples", "Office Depot® Office Max®"], terms: "office school supply stationery notebook paper pen pencil printer ink toner computer laptop desk chair shredder filing envelope" },
  { retailers: ["Sephora", "Ulta", "LUSH Fresh Handmade Cosmetics"], terms: "beauty cosmetic makeup skin skincare face facial moisturizer cleanser lipstick mascara foundation perfume fragrance hair shampoo conditioner bath body soap" },
  { retailers: ["Best Buy", "P.C. Richard and Son"], terms: "tv television electronics laptop computer tablet monitor keyboard mouse headphone speaker soundbar audio home theater refrigerator fridge washer dryer dishwasher microwave appliance" },
  { retailers: ["Babylist", "Baby Depot at Burlington", "Skip Hop"], terms: "baby infant newborn toddler supplies stroller carrier nursery crib high chair changing feeding bottle diaper bag toy" },
  { retailers: ["Carter’s", "OshKosh B'gosh", "babyGap", "The Children’s Place"], terms: "baby infant toddler kids children clothing clothes apparel outfit pajama onesie shirt pants dress coat jacket sock" },
  { retailers: ["Adidas", "Allbirds", "DSW", "Skechers", "Zappos.com"], terms: "shoe sneaker trainer footwear boot sandal running walking" },
  { retailers: ["AMC Theaters", "Cinemark", "Fandango", "Regal"], terms: "movie cinema film theater ticket" },
  { retailers: ["Marriott", "Best Western", "Hotels.com", "Fairmont Hotels & Resorts", "Global Hotel Card Powered by Expedia"], terms: "travel trip vacation hotel lodging accommodation room stay resort" },
  { retailers: ["Guitar Center"], terms: "music musical instrument guitar bass drum piano keyboard amplifier recording microphone" },
  { retailers: ["Michaels"], terms: "art craft supplies painting canvas yarn knitting sewing fabric bead scrapbook floral frame" },
  { retailers: ["Barnes & Noble"], terms: "book reading novel fiction nonfiction magazine journal puzzle" },
] as const;

// Shared category vocabulary covers every directory vendor. Specific items
// sold across departments belong in the retailer list above, not all vendors.
// Category reference: https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt
// Merchant references: https://www.walmart.com/cp/electronics/3944
// https://www.bestbuy.com/site/tv-home-theater/tvs/abcat0101000.c?id=abcat0101000
// https://www.publix.com/savings/all-deals/baby
// https://www.autozonepro.com/pdfs/Brands.pdf
// https://www.jiffylube.com/auto-services
export const categorySearchTerms: Readonly<Record<string, string>> = {
  automotive: "auto automotive car vehicle",
  babiesandkids: "baby infant newborn kids children toddler baby supply",
  charity: "charity donation donate relief",
  clothingandaccessories: "clothing clothes apparel fashion outfit accessories",
  groceries: "grocery groceries supermarket food milk bread egg cheese produce fruit vegetable meat chicken beef cereal pasta rice baking flour sugar juice water",
  convenience: "convenience snack drink",
  pharmacy: "pharmacy health personal care",
  healthandessentials: "pharmacy health personal care",
  gas: "gas fuel gasoline petrol gas station",
  fuelandconvenience: "gas fuel gasoline petrol gas station convenience",
  deliveryservices: "delivery delivery service",
  digitalandgaming: "digital video game gaming",
  electronics: "electronics electronic tech technology",
  entertainment: "entertainment leisure",
  experiences: "experience attraction activity adventure",
  foodandrestaurants: "restaurant dining meal",
  generalmerchandise: "general merchandise shopping",
  homefurnishings: "home furniture furnishings decor",
  homeimprovement: "home improvement renovation hardware tools",
  homefurnishingsandimprovement: "home furnishings improvement",
  pets: "pet pets animal",
  specialtyretail: "specialty retail",
  sportinggoods: "sport sports sporting athletic outdoor",
  travelandentertainment: "travel trip vacation tourism entertainment",
};

export const searchMetadataKey = (value: string) => value.normalize("NFKD").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const retailerTerms = new Map(Object.entries(retailerSearchTerms).map(([name, terms]) => [searchMetadataKey(name), terms]));
for (const assortment of retailerAssortments) for (const retailer of assortment.retailers) {
  const key = searchMetadataKey(retailer);
  retailerTerms.set(key, `${retailerTerms.get(key) ?? ""} ${assortment.terms}`);
}
const retailerCategories = new Map(giftCardPartnerGroups.flatMap(group => group.brands.map(brand => [searchMetadataKey(brand), group.category] as const)));
export function retailerDiscoveryTerms(retailer: string, category?: string) {
  const key = searchMetadataKey(retailer);
  const categoryKey = searchMetadataKey(category ?? retailerCategories.get(key) ?? "");
  return `${categorySearchTerms[categoryKey] ?? ""} ${retailerTerms.get(key) ?? ""}`.trim();
}
