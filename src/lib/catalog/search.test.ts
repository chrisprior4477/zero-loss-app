import { describe, expect, test } from "vitest";
import { demoProducts, type DemoProduct } from "./demo-products";
import { isGiftCardListing, productMatchesMarketplaceCategory } from "./navigation";
import { searchCatalog, searchCatalogMatches } from "./search";
import { matchesCatalogMerchant, remainingTicketFilter, searchDenominations } from "./search-denomination";

test("handles alternate word order for budgets, retailer categories and negation", () => {
  const slugs = (query: string) => searchCatalog(demoProducts, query).map(product => product.slug).sort();
  expect(slugs("Target prizes under $75")).toEqual(slugs("Target under $75"));
  expect(slugs("Target or Amazon gift cards excluding $25 or $50")).toEqual(
    [...slugs("Target gift cards excluding $25 or $50"), ...slugs("Amazon gift cards excluding $25 or $50")].sort());
  expect(slugs("anything but gift cards under $75")).toEqual(slugs("under $75 without gift cards"));
  const exclusions = searchCatalog(demoProducts, "prizes under $100 excluding gift cards and games");
  expect(exclusions.length).toBeGreaterThan(0);
  expect(exclusions.every(product => product.value < 100 && !isGiftCardListing(product) && !/\bgames?\b/i.test(product.title))).toBe(true);
  expect(slugs("almost full under $50")).toEqual(slugs("ending soon under $50"));
  expect(slugs("TVs 50 inches and up but below 65 inches")).toContain("samsung-m70h-tv");
  expect(slugs("TVs more than 50 and at most 65 inches")).toEqual(["lg-oled-c6-65-tv"]);
  expect(slugs("Target with fewer than six spaces left")).toEqual(slugs("Target with fewer than six tickets left"));
  expect(slugs("tickets left under 3 at Target")).toEqual(slugs("Target with under 3 tickets left"));
  expect(slugs("entries at most $1 each")).toEqual(slugs("prizes up to $1 per ticket"));
  expect(slugs("prizes with an entry fee of $1 or less")).toEqual(slugs("prizes up to $1 per ticket"));
  expect(slugs("prizes valued between $300 and $1000")).toEqual(slugs("prizes between $300 and $1000"));
  expect(slugs("Walmart gift cards with less than $100 face value")).toEqual(slugs("Walmart gift cards under $100"));
  expect(slugs("Walmart gift cards under USD $50")).toEqual(slugs("Walmart gift cards under $50"));
  const delivery = slugs("$100 gift cards from food delivery");
  expect(delivery).toContain("doordash-100-gift-card");
  expect(delivery.every(slug => slug.startsWith("doordash-") || slug.startsWith("uber-eats-"))).toBe(true);
  expect(slugs("$100 gift cards to order groceries")).toEqual(slugs("grocery $100 gift cards"));
  expect(slugs("gift cards from pharmacies under $100")).toContain("cvs-25-gift-card");
  const withoutGas = slugs("gift cards over $50 excluding gas");
  expect(withoutGas.length).toBeGreaterThan(0);
  expect(withoutGas).not.toContain("directory-speedway-100-gift-card");
  expect(slugs("no gas gift cards over $50")).toEqual(withoutGas);
});

test("preserves scope in retailer, budget, ticket, and exclusion searches", () => {
  function matches(query: string, predicate: (product: DemoProduct) => boolean) {
    const results = searchCatalog(demoProducts, query);
    expect(results.length, query).toBeGreaterThan(0);
    expect(results.every(predicate), query).toBe(true);
  }
  matches("Apple or Sony at Best Buy", p => p.retailer === "Best Buy" && /^(?:Apple|Sony)(?: |$)/i.test(p.brand));
  matches("Target gift cards except $25 or $50", p => p.retailer === "Target" && isGiftCardListing(p) && ![25, 50].includes(p.value));
  matches("gift cards $25 to $75 besides Walmart", p => p.retailer !== "Walmart" && isGiftCardListing(p) && p.value >= 25 && p.value <= 75);
  matches("any $100 gift cards for food", p => p.value === 100 && isGiftCardListing(p) && !productMatchesMarketplaceCategory(p, "pets"));
  expect(searchCatalog(demoProducts, "TVs at least 50 but under 65 inches").map(p => p.slug)).toContain("samsung-m70h-tv");
  expect(searchCatalog(demoProducts, "65 inch TVs that cost $3000 or less").map(p => p.slug)).toEqual(["lg-oled-c6-65-tv"]);
  matches("no gift cards under $75", p => !isGiftCardListing(p) && p.value < 75);
  matches("prizes with only 1 ticket left from Target", p => p.retailer === "Target" && p.capacity - p.sold === 1);
  matches("ending soon under $100", p => p.value < 100 && productMatchesMarketplaceCategory(p, "ending-soon"));
});

test.each([
  ["$25 Walmart gift card or $75 Target gift card", ["walmart-25-gift-card", "target-75-gift-card"]],
  ["Amazon $25 gift card or Target $25 gift card", ["amazon-25-gift-card", "target-25-gift-card"]],
  ["gift cards at exactly $25 from either Amazon or Target", ["amazon-25-gift-card", "target-25-gift-card"]],
  ["AirPods at Target or Best Buy", ["airpods-pro"]],
  ["Sony earbuds or headphones", ["sony-wh-1000xm5-headphones"]],
  ["TVs excluding Samsung and Sony", ["lg-oled-c6-65-tv"]],
  ["Sony or LG televisions not sold at Walmart", ["lg-oled-c6-65-tv"]],
  ["75-inch or 65-inch TVs under $3000", ["lg-oled-c6-65-tv"]],
  ["65-inch or 75-inch TVs under $3000", ["lg-oled-c6-65-tv"]],
  ["75-inch or 65-inch TVs under $1500", []],
  ["65-inch or 75-inch TVs under $1500", []],
  ["Sony WH-1000XM5 headphones $1 entry price", ["sony-wh-1000xm5-headphones"]],
  ["show me Sony headphones that are available", ["sony-wh-1000xm5-headphones"]],
  ["show me available Sony headphones", ["sony-wh-1000xm5-headphones"]],
  ["Sony headphones available", ["sony-wh-1000xm5-headphones"]],
  ["Sony or Bose headphones", ["sony-wh-1000xm5-headphones"]],
  ["TVs 55 inches or larger", ["lg-oled-c6-65-tv"]],
  ["50 inch Samsung and 65 inch LG TVs", ["samsung-m70h-tv", "lg-oled-c6-65-tv"]],
  ["Sony but not PlayStation", ["sony-wh-1000xm5-headphones"]],
  ["entries with a $1.00 fee", demoProducts.filter(product => product.entryPrice === 1).map(product => product.slug)],
])("keeps the product and all constraints together for %s", (query, expected) => {
  const actual = searchCatalogMatches(demoProducts, query, undefined, { includeLowerGiftCards: true }).map(({ product }) => product.slug);
  expect(actual.sort()).toEqual([...expected].sort());
});

test.each([
  ["products with 2 or 3 entries open", "products with 2 or 3 entries left"],
  ["where are your Sephora gift cards", "Sephora gift cards"],
  ["TV between 50 and 65 inches", "TVs from 50 to 65 inches"],
  ["TV with a 65-inch display", "65 inch TV"],
  ["Samsung and LG televisions up to $1000", "Samsung or LG TVs up to $1000"],
  ["Sony headphones priced lower than $500", "Sony headphones below $500"],
  ["Nike shoes under $125 retail", "Nike shoes under $125"],
  ["under $100 prize value Nintendo gift card", "Nintendo gift card under $100"],
  ["25, 50 or 75 gift cards from Target", "Target $25 or $50 or $75 gift cards"],
  ["$25 Target or Walmart gift cards but no $50", "Target $25 gift card or Walmart $25 gift card"],
  ["gift cards not sold at Amazon or Walmart", "gift cards except Amazon and Walmart"],
  ["Walmart gift cards without a $100 denomination", "Walmart gift cards excluding $100"],
  ["Amazon gift cards no more than $75 except twenty-five and fifty dollars", "Amazon gift cards up to $75 excluding $25 excluding $50"],
  ["Walmart gift cards over $25 up to $75", "Walmart gift cards over $25 and up to $75"],
  ["gift cards up to and including $75 from Walmart", "Walmart gift cards up to $75"],
  ["at most 2 entries available", "at most 2 entries left"],
  ["between 1 and 2 more tickets until full", "1 to 2 tickets left"],
  ["prizes with 2 tickets left or fewer", "at most 2 tickets left"],
  ["products with two or fewer tickets remaining", "products with at most two tickets remaining"],
  ["Best Buy gift cards with only 1 or 2 entries left", "Best Buy gift cards with one to two entries left"],
  ["Nike shoes that cost $1 a ticket", "Nike shoes $1 per entry"],
  ["one-dollar entries for Sony headphones", "Sony headphones $1 per entry"],
  ["search for Sony headphones", "Sony headphones"],
  ["$50 gift cards for auto expenses", "$50 automotive gift cards"],
])("recognizes %s without broadening its filters", (query, baseline) => {
  const slugs = (term: string) => searchCatalog(demoProducts, term).map(product => product.slug).sort();
  const expected = slugs(baseline);
  expect(expected.length).toBeGreaterThan(0);
  expect(slugs(query)).toEqual(expected);
});

test.each([
  ["gift cards $25 or $75 at Walmart and Target", "$25 or $75 gift cards from Walmart and Target"],
  ["Nintendo gift cards no more than $75 except $25 and $50", "Nintendo gift cards up to $75 excluding $25 excluding $50"],
  ["Walmart gift cards $25 to $75 excluding both $25 and $50", "Walmart gift cards $25 to $75 excluding $25 excluding $50"],
  ["Sony headphones, $1 to enter", "Sony headphones $1 per entry"],
  ["50 inch and 65 inch TVs", "50 inch or 65 inch TVs"],
  ["TVs not made by Samsung", "TVs without Samsung"],
  ["fewer than three slots left", "fewer than 3 tickets left"],
  ["one to two more entries before full", "1 to 2 tickets left"],
  ["price below $100 Nintendo gift card", "Nintendo gift card under $100"],
  ["gift cards from Walmart with a value between $25 and $75", "Walmart gift cards between $25 and $75"],
])("matches the same catalog results for %s", (query, baseline) => {
  const expected = searchCatalog(demoProducts, baseline).map(product => product.slug).sort();
  expect(expected.length).toBeGreaterThan(0);
  expect(searchCatalog(demoProducts, query).map(product => product.slug).sort()).toEqual(expected);
});

test("limits combined denominations to the named retailers", () => {
  const results = searchCatalog(demoProducts, "gift cards $25 or $75 at Walmart and Target");
  expect(results.map(product => [product.retailer, product.value]).sort()).toEqual([
    ["Target", 25], ["Target", 75], ["Walmart", 25], ["Walmart", 75],
  ]);
});

describe("catalog search", () => {
  test("typing available filters out a sold-out product with the same search name", () => {
    const pictured = demoProducts.find(product => product.slug === "sony-wh-1000xm5-headphones")!;
    const available = { ...pictured, sold: 0 };
    const closed = { ...pictured, slug: "closed-sony-headphones", sold: pictured.capacity };
    expect(searchCatalog([available, closed], "available Sony headphones")).toEqual([available]);
  });
  test("reads both ticket-count bounds before prize-price parsing", () => {
    expect(remainingTicketFilter("at least 2 and at most 5 entries remaining")).toEqual({ text: "", minimum: 2, maximum: 5 });
    expect(remainingTicketFilter("more than 1 but less than 6 tickets left")).toEqual({ text: "", minimum: 2, maximum: 5 });
    expect(remainingTicketFilter("at most five and more than two tickets left")).toEqual({ text: "", minimum: 3, maximum: 5 });
    expect(remainingTicketFilter("prizes that have fewer than 3 tickets left")).toEqual({ text: "", minimum: 1, maximum: 2 });
    expect(remainingTicketFilter("15 to 20 spots still available")).toEqual({ text: "", minimum: 15, maximum: 20 });
    expect(remainingTicketFilter("prizes with 200+ tickets left")).toEqual({ text: "", minimum: 200, maximum: Infinity });
    expect(remainingTicketFilter("1 ticket left or 2 tickets left")?.counts).toEqual(new Set([1, 2]));
    expect(searchDenominations("at least 2 and at most 5 entries remaining", demoProducts).budget).toBeNull();
  });

  test("finds both pictured cosmetics asked for under one brand", () => {
    const results = searchCatalog(demoProducts, "Milani lipstick and blush").map(product => product.slug).sort();
    expect(results).toEqual(["milani-baked-blush", "milani-color-fetish-lipstick"]);
    expect(searchCatalog(demoProducts, "Milani lipstick and radiator")).toEqual([]);
  });

  test.each([
    ["$25 Amazon GC only", "exactly $25 Amazon gift card"],
    ["Exactly $50 at Walmart or Amazon", "exactly $50 Walmart gift card or exactly $50 Amazon gift card"],
    ["Walmart gift cards $100 or under $25", "Walmart gift cards exactly $100 or Walmart gift cards under $25"],
    ["Any Amazon or Target gift card except $25", "Amazon or Target gift cards excluding $25"],
    ["Amazon $50 gift card only, no lower value", "exactly $50 Amazon gift card"],
    ["prizes under $100 $1 per entry", "under $100 $1 per entry"],
    ["Televisions $700 or less with a 50 inch screen", "50 inch TV up to $700"],
    ["TVs from 55 to 65 inches", "55 to 65 inch TVs"],
    ["headphones below $500 from Sony", "headphones below $500 by Sony"],
    ["gift cards under $75 from grocery stores", "grocery gift cards under $75"],
    ["sports and fitness gift cards under $75", "sporting goods gift cards under $75"],
    ["gift cards under $100, neither Amazon nor Target", "gift cards under $100 excluding Amazon and Target"],
    ["Nike below $125 price", "Nike below $125"],
    ["KONG dog toy $25 retail value", "KONG dog toy valued at $25"],
    ["gift cards for groceries under 75 US dollars", "grocery gift cards under $75"],
    ["gift cards strictly below $75", "gift cards below $75"],
    ["Target gift cards paying $1 each entry", "Target gift cards $1 per entry"],
    ["gift cards with 1 dollar entry fees", "gift cards $1 per entry"],
    ["gift cards except for the $25 ones", "gift cards excluding $25"],
    ["gift cards under $75 plus $100", "gift cards under $75 or $100"],
    ["PlayStation Store card $100", "$100 Sony PlayStation gift card"],
    ["100 dollars of Home Depot gift cards", "Home Depot $100 gift card"],
    ["Sony XM5 noise cancelling over-ear headphones", "Sony WH-1000XM5 headphones"],
    ["Nintendo $25 eShop balance", "Nintendo $25 gift card"],
    ["gift cards for take-away", "gift cards for takeout"],
    ["Lodge 10¼ cast iron pan", "Lodge 10.25-inch Cast Iron Skillet"],
    ["Hydro Flask 32oz bottle with straw lid", "Hydro Flask 32oz bottle with Flex Straw Cap"],
    ["Ninja four quart countertop airfryer", "Ninja AF101 air fryer"],
    ["KitchenAid Artisan five quart countertop mixer", "KitchenAid Artisan 5 quart stand mixer"],
    ["$100 Amazon gift card exact", "exactly $100 Amazon gift card"],
    ["Amazon gift cards at $100 face value", "exactly $100 Amazon gift card"],
    ["Amazon gift cards below USD100", "Amazon gift cards below $100"],
    ["gift cards in the $25–$50 price range", "gift cards between $25 and $50"],
    ["gift cards costing between $25 and $50", "gift cards between $25 and $50"],
    ["gift cards under $50 each", "gift cards under $50"],
    ["gift cards from $25 to under $50", "gift cards at least $25 and under $50"],
    ["gift cards under $75 or $100", "gift cards under $75 or gift cards exactly $100"],
    ["LG TV greater than 60 inches", "LG 65-inch TV"],
    ["TVs wider than 60 inches", "LG 65-inch TV"],
    ["Samsung TVs but no gift cards", "Samsung TVs without gift cards"],
    ["PlayStation 5 1.0 TB", "PlayStation 5 1 TB"],
    ["PlayStation 5 with 1000 GB", "PlayStation 5 1 TB"],
    ["gift cards with a $1 entry", "gift cards $1 per entry"],
    ["gift cards with entries at $1 each", "gift cards $1 per entry"],
    ["C.V.S. gift card", "CVS gift card"],
    ["OfficeMax gift card", "Office Depot gift card"],
    ["Delta Air Lines gift card", "Delta Airlines gift card"],
    ["Mc Donalds gift card", "McDonald’s gift card"],
    ["battery powered leaf blower", "Kobalt leaf blower"],
    ["gift cards $50 or cheaper", "gift cards at most $50"],
    ["gift cards 50 dollars each", "$50 gift cards"],
    ["gift cards either $25 or $50", "gift cards $25 or $50"],
    ["gift cards entry fee no more than $1", "gift cards up to $1 per entry"],
    ["gift cards tickets cost $1", "gift cards $1 per entry"],
    ["gift cards that aren’t from Amazon", "gift cards except Amazon"],
    ["TVs without Samsung", "LG 65-inch TV"],
    ["gift cards from either Amazon or Walmart", "Amazon or Walmart gift cards"],
    ["TVs by either Samsung or LG", "Samsung or LG TVs"],
    ["PlayStation with one terabyte", "1TB PlayStation"],
    ["50 inch class TV", "50 inch TV"],
    ["Samsung TV fifty inch", "Samsung 50 inch TV"],
    ["PlayStation 5 Slim at the Best Buy store", "PlayStation 5 Slim from Best Buy"],
    ["Game Stop gift card", "GameStop gift card"],
    ["Amazon gift cards worth more than $50 and $1 per entry", "Amazon gift cards more than $50"],
    ["Amazon gift cards $25–$50 for $1 entry", "Amazon gift cards $25–$50"],
    ["Amazon gift cards with an entry price of $1", "Amazon gift cards"],
    ["Amazon gift cards not under $75", "Amazon gift cards at least $75"],
    ["Amazon gift cards with $25, $50, $75", "Amazon gift cards $25, $50, $75"],
    ["Amazon gift cards $100 but not $75", "Amazon gift cards $100 excluding $75"],
    ["Amazon gift cards $75 or up", "Amazon gift cards at least $75"],
    ["Amazon gift cards in the $25 to $50 range", "Amazon gift cards $25 to $50"],
    ["Amazon gift cards up to $1 per ticket", "Amazon gift cards"],
    ["Gift cards under $50 or over $75 at Amazon", "Amazon gift cards under $50 or over $75"],
    ["Sony or Samsung TVs", "Sony TVs or Samsung TVs"],
    ["PlayStation 5 Slim Model from Best Buy", "PlayStation 5 Slim Model"],
    ["Amazon gift cards valued at $100", "$100 Amazon gift card"],
    ["Amazon gift cards costing $100", "$100 Amazon gift card"],
    ["Amazon gift cards no greater than $100", "Amazon gift cards at most $100"],
    ["Amazon gift cards not exceeding $100", "Amazon gift cards at most $100"],
    ["Amazon gift cards $100 or lower", "Amazon gift cards at most $100"],
    ["Amazon gift cards $50 minimum", "Amazon gift cards at least $50"],
    ["Amazon gift cards at or above $75", "Amazon gift cards at least $75"],
    ["Amazon gift cards at or below $75", "Amazon gift cards at most $75"],
    ["PS5 Slim from Best Buy only", "PS5 Slim from Best Buy"],
    ["PlayStation 5 Slim by Sony", "PlayStation 5 Slim"],
    ["PS5, no gift cards", "PS5 without gift cards"],
    ["Gift cards sold by Amazon", "Amazon gift cards"],
    ["Gift cards not sold by Amazon", "Gift cards except Amazon"],
    ["Gift cards everywhere except Amazon", "Gift cards except Amazon"],
    ["Gift cards between $25 & $50", "Gift cards between $25 and $50"],
    ["Gift cards with values from $25 to $50", "Gift cards from $25 to $50"],
    ["Gift cards $25, 50, 75", "Gift cards $25, $50, $75"],
    ["Gift cards $25.00, $50.00 or $75.00", "Gift cards $25, $50, $75"],
    ["Gift cards $25 to $50 for an entry fee of $1", "Gift cards $25 to $50 for $1 per entry"],
    ["Gift cards $1 a ticket", "Gift cards $1 per entry"],
    ["Gift cards $1 each entry", "Gift cards $1 per entry"],
    ["Gift cards $1 or less per ticket", "Gift cards up to $1 per ticket"],
    ["Gift cards at $1 per entry only", "Gift cards $1 per entry"],
  ])("keeps the intended qualifiers for %s", (query, equivalent) => {
    const slugs = (term: string) => searchCatalog(demoProducts, term).map(product => product.slug).sort();
    expect(slugs(query)).toEqual(slugs(equivalent));
    expect(slugs(query).length).toBeGreaterThan(0);
  });
  test("keeps currency, retailer aliases and television sizes distinct", () => {
    expect(searchCatalog(demoProducts, "Amazon $100 CAD gift card")).toEqual([]);
    for (const [query, retailer] of [["Wal-Mart gift card", /^Walmart/], ["Door Dash gift card", /^DoorDash$/], ["X Box gift card", /^Xbox$/i]] as const) {
      const results = searchCatalog(demoProducts, query);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(product => retailer.test(product.retailer))).toBe(true);
    }
    const tvs = ["lg-oled-c6-65-tv", "samsung-m70h-tv"];
    for (const query of ["50 inch or 65 inch TV", "TV 50 to 65 inches"]) {
      expect(searchCatalog(demoProducts, query).map(product => product.slug).sort()).toEqual(tvs);
    }
    expect(searchCatalog(demoProducts, "Samsung TV 45–55 inch").map(product => product.slug)).toEqual(["samsung-m70h-tv"]);
  });
  test("matches compact storage units, leading price ceilings, and retailer exclusions", () => {
    expect(searchCatalog(demoProducts, "Sony PS5 Slim 1TB").some(item => item.slug === "playstation-5-slim")).toBe(true);
    expect(searchCatalog(demoProducts, "Amazon max $75")).toEqual(searchCatalog(demoProducts, "Amazon up to $75"));
    const withoutAmazon = searchCatalog(demoProducts, "gift cards below $75 excluding Amazon");
    expect(withoutAmazon.length).toBeGreaterThan(0);
    expect(withoutAmazon.every(item => item.value < 75 && item.retailer !== "Amazon")).toBe(true);
  });
  test.each([
    ["Amazon gift cards from $25–$75", [25, 50, 75]],
    ["Amazon gift cards 50 dollars+", [50, 75, 100]],
    ["Amazon gift cards <$75 but >=$50", [50]],
    ["Amazon gift card 25, 50, and 75 dollars", [25, 50, 75]],
    ["Amazon gift card not 50 dollars", [25, 75, 100]],
    ["Amazon gift cards <= $100 <= $50", [25, 50]],
  ] as const)("preserves the requested denominations in %s", (query, expected) => {
    const values = searchCatalog(demoProducts, query).map(product => product.value).sort((left, right) => left - right);
    expect(values).toEqual(expected);
  });

  test("handles merchant alternatives, shared budgets and independently priced products", () => {
    const cards = searchCatalog(demoProducts, "Amazon or Best Buy gift cards under $75");
    expect(new Set(cards.map(product => product.retailer))).toEqual(new Set(["Amazon", "Best Buy"]));
    expect(cards.every(product => product.value < 75)).toBe(true);
    expect(searchCatalog(demoProducts, "gift cards from Amazon & Walmart").map(product => product.slug)).toEqual(
      expect.arrayContaining(["amazon-50-gift-card", "walmart-50-gift-card"]),
    );
    expect(searchCatalog(demoProducts, "PlayStation 5 or Amazon gift voucher for $50").map(product => product.slug)).toEqual(
      expect.arrayContaining(["playstation-5-slim", "amazon-50-gift-card"]),
    );
  });

  test("keeps comparisons, retailer exclusions, and entry prices separate", () => {
    const range = searchCatalog(demoProducts, "gift cards >=50 and <=75");
    expect(range.map(product => product.slug)).toContain("amazon-75-gift-card");
    expect(range.every(product => product.value >= 50 && product.value <= 75)).toBe(true);
    expect(searchCatalog(demoProducts, "gift cards over $100 and below $50")).toEqual([]);
    expect(searchCatalog(demoProducts, "$75 Amazon gift card not $50").map(product => product.slug)).toEqual(["amazon-75-gift-card"]);
    const excluding = searchCatalog(demoProducts, "$75 gift cards from anybody but Walmart");
    expect(excluding.map(product => product.slug)).toContain("amazon-75-gift-card");
    expect(excluding.every(product => product.value === 75 && !product.retailer.startsWith("Walmart"))).toBe(true);
    expect(searchCatalog(demoProducts, "Nike $1 per entry").map(product => product.slug)).toContain("nike-court-shot-shoes");
  });

  test.each(["25 dollar Amazon gift card", "Amazon gift card 25 dollars", "Amazon 25 USD gift card"])("extracts the currency words in %s", query => {
    expect(searchCatalog(demoProducts, query).map(product => product.slug)).toEqual(["amazon-25-gift-card"]);
  });

  test.each([
    ["gift cards less than or equal to $50", [25, 50]],
    ["gift cards greater than or equal to $75", [75, 100]],
    ["gift cards at least $50, up to $75", [50, 75]],
    ["gift cards under $75 and under $50", [25]],
    ["gift cards $25 through 75 dollars", [25, 50, 75]],
    ["gift cards between $25 and $50 inclusive", [25, 50]],
    ["gift cards $75 not $50 and not $100", [75]],
    ["gift cards less than $50 or over $75", [25, 100]],
    ["gift cards with $1.00/entry", [25, 50, 75, 100]],
    ["gift cards $75 and under please", [25, 50, 75]],
  ] as const)("keeps the intended gift card values for %s", (query, expected) => {
    const cards = demoProducts.filter(product => /^(?:amazon|walmart)-(?:25|50|75|100)-gift-card$/.test(product.slug));
    expect([...new Set(searchCatalog(cards, query).map(product => product.value))].sort((a, b) => a - b)).toEqual(expected);
  });

  test("recognizes an explicit retailer exclusion in natural wording", () => {
    const matches = searchCatalog(demoProducts, "gift cards from retailers other than Walmart");
    expect(matches.some(product => product.slug === "amazon-75-gift-card")).toBe(true);
    expect(matches.some(product => product.retailer.startsWith("Walmart"))).toBe(false);
  });

  test("accepts thru in an inclusive gift-card price range", () => {
    expect(searchCatalog(demoProducts, "Walmart gift cards from $25 thru $75").map(product => product.value).sort()).toEqual([25, 50, 75]);
  });

  test("keeps each alternative independent and supports explicit gift-card exclusions", () => {
    const list = searchCatalog(demoProducts, "TV, monitor, or headphones").map(item => item.slug);
    expect(list).toEqual(expect.arrayContaining(["lg-oled-c6-65-tv", "sony-wh-1000xm5-headphones"]));
    const mixed = searchCatalog(demoProducts, "TV under $1,000 or headphones").map(item => item.slug);
    expect(mixed).toContain("sony-wh-1000xm5-headphones");
    expect(mixed).not.toContain("lg-oled-c6-65-tv");
    expect(searchCatalog(demoProducts, "Sony headphones not gift cards").map(item => item.slug)).toEqual(["sony-wh-1000xm5-headphones"]);
  });
  test.each([
    ["$50 Amazon or Walmart gift cards", ["amazon-50-gift-card", "walmart-50-gift-card"]],
    ["Amazon $25 or $75 gift cards", ["amazon-25-gift-card", "amazon-75-gift-card"]],
    ["Amazon $50 and Walmart $75 gift cards", ["amazon-50-gift-card", "walmart-75-gift-card"]],
  ] as const)("keeps merchant and denomination scope for %s", (query, expected) => {
    expect(searchCatalog(demoProducts, query).map(item => item.slug).sort()).toEqual([...expected].sort());
  });

  test("retains restrictions for retailer families, accessory names and signed price bounds", () => {
    const only = searchCatalog(demoProducts, "Walmart only");
    expect(only.map(item => item.slug)).toContain("walmart-75-gift-card");
    const excluded = searchCatalog(demoProducts, "gift cards excluding Walmart");
    expect(excluded.length).toBeGreaterThan(0);
    expect(excluded.some(item => item.retailer.startsWith("Walmart"))).toBe(false);
    expect(searchCatalog(demoProducts, "Auto Zone $50")).toEqual(searchCatalog(demoProducts, "AutoZone $50"));
    expect(searchCatalog(demoProducts, "TV stand").some(item => /-tv$/.test(item.slug))).toBe(false);
    const bounded = searchCatalog(demoProducts, "gift cards >= $50");
    expect(bounded.some(item => item.value > 50)).toBe(true);
    expect(bounded.every(item => item.value >= 50)).toBe(true);
  });

  test("honors an inclusive minimum and an exact value in natural requests", () => {
    const minimum = searchCatalog(demoProducts, "Walmart gift cards 75 dollars or higher");
    const exact = searchCatalog(demoProducts, "Can you please show me any available deals for only $75 Walmart gift cards in the list");
    expect(minimum.some(item => item.value === 75)).toBe(true);
    expect(minimum.every(item => item.value >= 75)).toBe(true);
    expect(exact.length).toBeGreaterThan(0);
    expect(exact.every(item => item.value === 75 && item.retailer.startsWith("Walmart"))).toBe(true);
  });
  test.each(["Walmart $100", "Walmart 100", "Walmart 100 dollars", "Walmart one hundred dollars", "Walmart for like a hundred dollars"])("matches the retailer and exact prize value for %s", query => {
    const matches = searchCatalog(demoProducts, query);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every(product => product.value === 100 && product.retailer.startsWith("Walmart"))).toBe(true);
  });
  test.each([["Walmart gift cards under $100", false], ["Walmart gift cards up to one hundred dollars", true], ["Walmart up to $100 gift cards", true], ["Walmart up to 100 gift cards", true]])("applies the budget in %s", (query, inclusive) => {
    const matches = searchCatalog(demoProducts, query);
    expect(matches.some(product => product.value === 75)).toBe(true);
    expect(matches.some(product => product.value === 100)).toBe(inclusive);
    expect(matches.every(product => product.value <= 100 && product.title.includes("Gift Card") && product.retailer.startsWith("Walmart"))).toBe(true);
  });
  test("spoken and numeric values filter even when another number appears in an item's description or title", () => {
    const sample = demoProducts.slice(0, 2).map((p, i) => ({ ...p, title: "Walmart 300-piece kit", retailer: "Walmart", value: i ? 300 : 100 }));
    expect(searchCatalog(sample, "Walmart three hundred dollars")).toEqual([sample[1]]);
    expect(searchCatalog(sample, "$300")).toEqual([sample[1]]);
    expect(searchCatalog(sample, "Walmart $25")).toEqual([]);
    expect(searchCatalog(demoProducts, "AirPods Pro 3")[0]?.slug).toBe("airpods-pro");
  });
  test.each([
    ["Walmart gift cards $75 and up", [75, 100]],
    ["Walmart gift cards at least $75", [75, 100]],
    ["Walmart gift cards above $75", [100]],
    ["Walmart gift cards priced from $50 to $75", [50, 75]],
    ["Walmart gift cards between $25 and $75", [25, 50, 75]],
    ["Walmart gift cards between twenty-five dollars and seventy-five dollars", [25, 50, 75]],
  ])("uses inclusive natural-language prize bounds for %s", (query, amounts) => {
    const matches = searchCatalog(demoProducts, query);
    expect(matches.every(product => product.retailer.startsWith("Walmart") && product.title.includes("Gift Card"))).toBe(true);
    expect([...new Set(matches.map(product => product.value))].sort((a, b) => a - b)).toEqual(amounts);
  });
  test.each(["Walmart 100 gift card", "100 Walmart gift cards", "Walmart $100 gift card"])("applies a gift-card denomination in either word order: %s", query => {
    const matches = searchCatalog(demoProducts, query);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every(product => product.value === 100 && product.title.includes("Gift Card") && product.retailer.startsWith("Walmart"))).toBe(true);
  });
  test.each([
    ["Walmart gift cards no more than $75", [25, 50, 75]],
    ["Walmart gift cards at least $25 and under $75", [25, 50]],
    ["Walmart gift cards under $75 and above $25", [50]],
    ["Walmart gift cards $25 to $75", [25, 50, 75]],
    ["Walmart gift cards above $50 only", [75, 100]],
    ["Walmart gift cards 75 bucks", [75]],
    ["Walmart gift cards $75 or less?", [25, 50, 75]],
    ["Walmart gift cards $75 & below", [25, 50, 75]],
    ["Walmart gift cards $75+", [75, 100]],
    ["Walmart gift cards not over $75", [25, 50, 75]],
    ["Walmart gift cards no less than $75", [75, 100]],
    ["Walmart GC under $75", [25, 50]],
    ["Walmart gift cards 25 or 75", [25, 75]],
    ["Walmart gift cards $75 max", [25, 50, 75]],
    ["Walmart gift cards $75 or less,", [25, 50, 75]],
    ["Walmart gift cards $25 or 75", [25, 75]],
  ])("applies the requested prize values for %s", (query, expected) => {
    const cards = searchCatalog(demoProducts, query);
    expect(cards.every(card => card.retailer.startsWith("Walmart") && card.title.includes("Gift Card"))).toBe(true);
    expect([...new Set(cards.map(card => card.value))].sort((a, b) => a - b)).toEqual(expected);
  });

  test.each(["PS-5", "Play Station 5"])("finds the pictured console for %s", query => {
    expect(searchCatalog(demoProducts, query)[0]?.slug).toBe("playstation-5-slim");
  });

  test.each([
    ["Sony WH1000XM5", "sony-wh-1000xm5-headphones"],
    ["Sony WH 1000 XM5", "sony-wh-1000xm5-headphones"],
    ["Nintendo Switch O.L.E.D.", "nintendo-switch"],
  ])("finds the advertised model for %s", (query, slug) => {
    expect(searchCatalog(demoProducts, query)[0]?.slug).toBe(slug);
  });

  test.each(["Only $100 Walmart gift cards", "Walmart gift cards only $100"])("keeps exact-only meaning for %s", query => {
    const results = searchCatalogMatches(demoProducts, query, undefined, { includeLowerGiftCards: true });
    expect(results[0]?.product.slug).toBe("walmart-100-gift-card");
    expect(results.every(result => result.product.value === 100)).toBe(true);
  });

  test("recognizes retailer gift-card shorthand and avoids unrelated App Store matches", () => {
    expect(searchCatalog(demoProducts, "Home Depot GC")).toEqual(searchCatalog(demoProducts, "Home Depot gift card"));
    expect(searchCatalog(demoProducts, "App Store giftcards")).toEqual([]);
  });

  test("an exact-only gift-card query prioritizes the standard card and excludes lower values", () => {
    const results = searchCatalogMatches(demoProducts, "Walmart $100 gift card only", undefined, { includeLowerGiftCards: true });
    expect(results[0]?.product.slug).toBe("walmart-100-gift-card");
    expect(results.every(({ product }) => product.value === 100)).toBe(true);
  });
  test.each([
    ["TJ Maxx $100", "T.J.Maxx $100"],
    ["TJMaxx $100", "T.J.Maxx $100"],
    ["CVS eGift Card", "CVS gift card"],
  ])("finds the same cards for %s as %s", (alias, query) => {
    const expected = searchCatalog(demoProducts, query).map(product => product.slug);
    expect(expected.length).toBeGreaterThan(0);
    expect(searchCatalog(demoProducts, alias).map(product => product.slug)).toEqual(expected);
  });

  test.each(["Home Depot 25", "Home Depot $25", "Home Depot twenty‑five dollars"])("recognizes a Home Depot denomination in %s", query => {
    const matches = searchCatalog(demoProducts, query);
    expect(matches.map(product => product.title)).toEqual(["$25 The Home Depot Gift Card"]);
  });
  test("makeup finds the pictured cosmetics before related gift cards", () => {
    const matches = searchCatalogMatches(demoProducts, "makeup");
    expect(matches.slice(0, 3).map(match => match.product.slug).sort()).toEqual([
      "milani-baked-blush", "milani-color-fetish-lipstick", "milani-stay-put-eyeliner",
    ]);
    expect(matches.some(match => match.product.retailer === "Sephora")).toBe(true);
  });
  test.each(["auto", "atuo", "automot", "automotvie"])("finds every automotive vendor for %s", query => {
    const retailers = searchCatalog(demoProducts, query).map(product => product.retailer);
    expect(retailers).toEqual(expect.arrayContaining(["AutoZone®", "Jiffy Lube®", "Turo"]));
    expect(searchCatalog(demoProducts, query).some(product => product.slug === "lg-oled-c6-65-tv")).toBe(false);
  });

  test.each(["car battery", "car batteries", "car batery", "spark plugs", "sparkplugs", "spark plgs", "brake pads", "windshield wipers", "cabin air filter", "oil change"])("finds automotive retailers for %s without matching a car-rental card", query => {
    const retailers = searchCatalog(demoProducts, query).map(product => product.retailer);
    if (query !== "oil change") expect(retailers).toContain("AutoZone®");
    expect(retailers).toContain("Jiffy Lube®");
    expect(retailers).not.toContain("Turo");
  });

  test.each([
    ["sofa", "Wayfair"], ["printer ink", "Staples"], ["lipstick", "Sephora"],
    ["baby stroller", "Babylist"], ["movie tickets", "AMC Theaters"], ["guitar", "Guitar Center"],
  ])("finds the relevant merchant family for %s", (query, retailer) => {
    expect(searchCatalog(demoProducts, query).map(product => product.retailer)).toContain(retailer);
  });

  test.each([
    ["Amazon gift card under $100 but over $25", [50, 75]],
    ["Amazon gift card >=$50 <=$75", [50, 75]],
    ["Amazon gift cards between $25-$75", [25, 50, 75]],
    ["30 dollars or less Amazon gift cards", [25]],
    ["Amazon gift cards twenty five, fifty and seventy five dollars", [25, 50, 75]],
  ] as const)("keeps the requested denominations for %s", (query, expected) => {
    expect(searchCatalog(demoProducts, query).map(product => product.value).sort((a, b) => a - b)).toEqual(expected);
  });

  test("every listed retailer remains searchable by its own name", () => {
    for (const retailer of new Set(demoProducts.map(product => product.retailer))) {
      expect(searchCatalog(demoProducts, retailer).some(product => product.retailer === retailer), retailer).toBe(true);
    }
    expect(searchCatalog(demoProducts, "Best Buy").every(product => product.retailer === "Best Buy")).toBe(true);
  }, 20_000);

  test.each(["TV", "televis", "televison"])("finds actual TVs and relevant gift cards for %s", query => {
    const matches = searchCatalogMatches(demoProducts, query);
    expect(matches[0].kind).toBe("product");
    expect(matches.some(match => match.product.slug === "lg-oled-c6-65-tv")).toBe(true);
    for (const retailer of ["Walmart", "Best Buy"]) {
      expect(matches.some(match => match.product.retailer === retailer && match.kind === "retailer")).toBe(true);
    }
    expect(matches.some(match => match.product.retailer === "Microsoft Office 365 Home")).toBe(false);
  });

  test.each(["baby products", "baby supplies", "babby products"])("finds baby retailers for %s", query => {
    const matches = searchCatalog(demoProducts, query);
    expect(matches.map(product => product.retailer)).toEqual(expect.arrayContaining(["Walmart", "Publix"]));
  });

  test.each(["walm", "walmrat"])("finds Walmart from partial or mistyped %s", query => {
    expect(searchCatalog(demoProducts, query).some(product => product.retailer === "Walmart")).toBe(true);
  });

  test("known brand names do not become another retailer through fuzzy matching", () => {
    const retailers = searchCatalog(demoProducts, "Vons").map(product => product.retailer);
    expect(retailers.length).toBeGreaterThan(0);
    expect(retailers.every(retailer => retailer === "Vons")).toBe(true);
  });
  test.each([["atuo", "auto"], ["car batery", "car battery"]])("corrects %s to its shopping concept rather than incidental product descriptions", (typo, intended) => {
    expect(new Set(searchCatalog(demoProducts, typo).map(product => product.slug)))
      .toEqual(new Set(searchCatalog(demoProducts, intended).map(product => product.slug)));
  });
  test("matches familiar product words and synonyms", () => {
    expect(searchCatalog(demoProducts, "TV").map(product => product.slug)).toEqual(expect.arrayContaining([
      "samsung-m70h-tv",
      "lg-oled-c6-65-tv",
    ]));
    expect(searchCatalog(demoProducts, "sneakers")[0]?.slug).toBe("nike-court-shot-shoes");
    expect(searchCatalog(demoProducts, "shoes")[0]?.slug).toBe("nike-court-shot-shoes");
  });

  test("matches brands and marketplace categories", () => {
    expect(new Set(searchCatalog(demoProducts, "gas").map(product => product.brand))).toEqual(new Set(["BP", "Pilot Flying J", "Speedway", "Sheetz"]));
    expect(searchCatalog(demoProducts, "coffee").some(product => product.brand === "Starbucks")).toBe(true);
    expect(searchCatalog(demoProducts, "coffee").some(product => product.brand === "Dunkin'")).toBe(true);
  });

  test("returns no products for something outside the catalog", () => {
    expect(searchCatalog(demoProducts, "kayak")).toEqual([]);
  });

  test.each(["baby stuff", "baby things", "I'm looking for baby stuff", "supplies for my baby", "newborn supplies", "daipers"])("finds Baby's Essentials for %s", query => {
    expect(searchCatalog(demoProducts, query)[0]?.slug).toBe("babys-essentials-bundle");
  });

  test.each(["reciprocating saw", "reciprocating saws", "reciprocaitng saw", "power tools", "sawzall"])("offers existing Home Depot cards for %s", query => {
    const matches = searchCatalogMatches(demoProducts, query);
    expect(matches.some(match => match.product.retailer === "The Home Depot")).toBe(true);
    expect(matches.every(match => ["The Home Depot", "Lowe's", "Menards®", "Ace Hardware"].includes(match.product.retailer) && match.product.slug.endsWith("-gift-card"))).toBe(true);
  });

  test.each(["pet food", "pet treats", "dog food", "cat treats", "puppy food", "pet supplies"])("offers PetSmart instead of unrelated groceries for %s", query => {
    const matches = searchCatalogMatches(demoProducts, query);
    expect(matches.some(match => match.product.retailer === "PetSmart")).toBe(true);
    expect(matches.every(match => ["PetSmart", "Petco", "Chewy®", "1-800-PetSupplies.com"].includes(match.product.retailer))).toBe(true);
    expect(matches.filter(match => match.kind === "product").every(match => ["kong-classic-dog-toy", "catit-flower-fountain"].includes(match.product.slug))).toBe(true);
  });

  test.each(["medicine", "medication", "meds", "cold medicine"])("offers existing CVS and Walmart cards for %s", query => {
    const matches = searchCatalogMatches(demoProducts, query);
    expect(matches).toHaveLength(12);
    expect(matches.every(match => ["CVS", "Walgreens", "Walmart"].includes(match.product.retailer) && match.kind === "retailer")).toBe(true);
  });

  test("keeps a named medicine retailer specific", () => {
    const matches = searchCatalogMatches(demoProducts, "CVS medicine");
    expect(matches).toHaveLength(4);
    expect(matches.every(match => match.product.retailer === "CVS")).toBe(true);
  });

  test("finds existing paper-towel retailers without inventing an item", () => {
    const matches = searchCatalogMatches(demoProducts, "paper towels");
    expect(matches).toHaveLength(9);
    expect(new Set(matches.map(match => match.product.retailer))).toEqual(new Set(["Walmart", "CVS", "Publix"]));
    expect(matches.every(match => match.kind === "retailer" && match.product.title.includes("Gift Card"))).toBe(true);
    expect(searchCatalog(demoProducts, "Walmart paper towels")).toHaveLength(4);
    expect(searchCatalog(demoProducts, "paper towels spaceship")).toEqual([]);
  });

  test.each(["Pet Smart", "PETSMART", "petsmrat", "PetSmart giftcards"])("normalizes retailer spelling and spacing for %s", query => {
    const products = searchCatalog(demoProducts, query);
    expect(products).toHaveLength(query === "PetSmart giftcards" ? 4 : 6);
    expect(products.every(product => product.retailer === "PetSmart")).toBe(true);
  });

  test.each(["baby spaceship", "pet reciprocating saw", "reciprocating saw underwater", "pineapple", "", "stuff", "please find me somethingz", "x".repeat(513)])("does not discard meaningful unknown words or invent matches for %s", query => {
    expect(searchCatalog(demoProducts, query)).toEqual([]);
  });

  test("preserves brand intent instead of expanding brands into competitors", () => {
    expect(searchCatalog(demoProducts, "Starbucks").every(product => product.brand === "Starbucks")).toBe(true);
    expect(searchCatalog(demoProducts, "Nintendo").some(product => product.slug === "playstation-5-slim")).toBe(false);
    expect(searchCatalog(demoProducts, "PetSmart $25").map(product => product.slug)).toEqual(["kong-classic-dog-toy", "petsmart-25-gift-card"]);
  });

  test("ranks an actual product above related retailer cards and does not mutate catalog records", () => {
    const saw: DemoProduct = { ...demoProducts[0], slug: "test-reciprocating-saw", title: "Reciprocating Saw", retailer: "The Home Depot" };
    const catalog = Object.freeze([...demoProducts, saw]);
    const before = JSON.stringify(catalog);
    const results = searchCatalogMatches(catalog, "reciprocating saw");
    expect(results[0]).toEqual({ product: saw, kind: "product" });
    expect(results.slice(1).every(match => match.kind === "retailer")).toBe(true);
    expect(JSON.stringify(catalog)).toBe(before);
  });

  test("only expands gift cards already present in the supplied catalog/category", () => {
    const baby = demoProducts.filter(product => product.slug === "babys-essentials-bundle");
    expect(searchCatalog(baby, "dog food")).toEqual([]);
    expect(searchCatalog([], "reciprocating saw")).toEqual([]);
    expect(searchCatalogMatches(demoProducts, "baby stuff")[0].kind).toBe("product");
  });
});

test.each([
  ["Amazon gift cards from $25 up to $75", [25, 50, 75]],
  ["Amazon gift cards between US$25 and US$75", [25, 50, 75]],
  ["Amazon gift cards no higher than seventy five", [25, 50, 75]],
  ["Amazon gift cards under $75.00, thanks", [25, 50]],
  ["Amazon gift cards starting at $50", [50, 75, 100]],
  ["Amazon gift cards with a maximum of $75", [25, 50, 75]],
  ["Amazon $50 USD gift cards under $75", [50]],
  ["Amazon gift cards $25 to $75 total", [25, 50, 75]],
] as const)("keeps the requested retailers and values for %s", (query, expected) => {
  const matches = searchCatalog(demoProducts, query);
  expect(matches.every(product => product.retailer === "Amazon")).toBe(true);
  expect([...new Set(matches.map(product => product.value))].sort((a, b) => a - b)).toEqual(expected);
});

test("keeps retailer alternatives separate from the conjunction inside a range", () => {
  const results = searchCatalog(demoProducts, "Amazon and Walmart gift cards between $50 and $75");
  expect(new Set(results.map(product => product.retailer))).toEqual(new Set(["Amazon", "Walmart"]));
  expect(new Set(results.map(product => product.value))).toEqual(new Set([50, 75]));
  const excluded = searchCatalog(demoProducts, "gift cards for fifty dollars, no Walmart");
  expect(excluded.some(product => product.retailer === "Amazon")).toBe(true);
  expect(excluded.some(product => product.retailer.startsWith("Walmart"))).toBe(false);
});

test.each([
  ["Apple Air Pods", "airpods-pro"],
  ["Sony WH1000 XM 5 headphones", "sony-wh-1000xm5-headphones"],
  ["65” class TV", "lg-oled-c6-65-tv"],
  ["PS5 Slim 1 terabyte", "playstation-5-slim"],
  ["10¼ Lodge cast iron", "lodge-classic-10-inch-skillet"],
])("finds the pictured item for %s", (query, slug) => {
  expect(searchCatalog(demoProducts, query).some(product => product.slug === slug)).toBe(true);
});

test("strict entry-price comparisons stay in the fee field and exclude the limit", () => {
  const card = demoProducts.find(product => product.slug === "lowes-150-gift-card")!;
  const products = [card, { ...card, slug: "reduced-gift-card", entryPrice: 0.75 }];
  for (const query of ["gift cards entry price below $1", "gift cards less than $1 per entry"]) {
    expect(searchCatalog(products, query).map(product => product.slug)).toEqual(["reduced-gift-card"]);
  }
});

test("keeps a TV retailer exclusion separate from an electronics brand exclusion", () => {
  expect(searchCatalog(demoProducts, "TVs not from Best Buy")).toEqual([]);
  expect(searchCatalog(demoProducts, "TVs except for LG").map(product => product.slug)).toEqual(["samsung-m70h-tv"]);
});

test.each([
  ["Wireless headset by Sony", "sony-wh-1000xm5-headphones"],
  ["Walmart giftcard twenty five", "walmart-25-gift-card"],
  ["Bissell Little Green portable carpet washer", "bissell-little-green-1400b"],
  ["Dog chew toy from pet smart", "kong-classic-dog-toy"],
  ["Blender bottle cup", "blenderbottle-classic-shaker"],
  ["PS5 console no game bundle", "playstation-5-slim"],
])("matches the intended item for %s", (query, slug) => {
  expect(searchCatalog(demoProducts, query)[0]?.slug).toBe(slug);
});

test("keeps an explicit decimal gift-card value exact in Browse", () => {
  const cards = searchCatalogMatches(demoProducts, "Amazon 100.00 gift card", undefined, { includeLowerGiftCards: true });
  expect(cards.map(({ product }) => product.slug)).toEqual(["amazon-100-gift-card"]);
});

test.each([
  ["Penn Battle 4 fishing reel", "penn-battle-iv-2500"],
  ["Kobalt battery powered garden blower", "kobalt-24v-leaf-blower"],
  ["JBL Flip seven Bluetooth speaker", "jbl-flip-7-speaker"],
  ["Fujifilm mini twelve instant camera", "instax-mini-12-camera"],
  ["Lodge ten and a quarter inch skillet", "lodge-classic-10-inch-skillet"],
  ["Bissell upholstery spot remover", "bissell-little-green-1400b"],
  ["BlenderBottle protein shaker", "blenderbottle-classic-shaker"],
  ["OOLY air dry modelling clay car kit", "ooly-turbo-tabby-clay-kit"],
  ["Dyson V 8 stick hoover", "dyson-v8-cordless-vacuum"],
  ["Sony WH1000-XM5 over ear ANC", "sony-wh-1000xm5-headphones"],
  ["YETI 30 fl oz tumbler", "yeti-rambler-30-tumbler"],
  ["RYOBI 18 volt cordless inflator", "ryobi-one-plus-inflator"],
  ["Amazon twenty five dollar voucher", "amazon-25-gift-card"],
  ["Publix $100 grocery voucher", "publix-100-gift-card"],
  ["Sheetz $75 fuel voucher", "sheetz-75-gift-card"],
  ["Home Goods 75 dollar card", "homegoods-75-gift-card"],
])("uses the shopper's wording for %s", (query, slug) => {
  expect(searchCatalog(demoProducts, query).map(item => item.slug)).toContain(slug);
});

test.each([
  ["gift cards cheaper than $75", "gift cards under $75"],
  ["gift cards with a value of $50", "$50 gift cards"],
  ["gift cards costing $1 to enter", "gift cards $1 per entry"],
  ["gift cards with $1 tickets", "gift cards $1 per entry"],
  ["Nintendo eShop giftcard", "Nintendo gift card"],
  ["gift cards all retailers except Amazon and Walmart", "gift cards except Amazon and Walmart"],
  ["gift cards other than $25", "gift cards excluding $25"],
])("parses %s like the equivalent search", (query, standard) => {
  const slugs = (phrase: string) => searchCatalog(demoProducts, phrase).map(item => item.slug).sort();
  const expected = slugs(standard);
  expect(expected.length).toBeGreaterThan(0);
  expect(slugs(query)).toEqual(expected);
});

test("includes the stated TV size at an inclusive upper limit", () => {
  const tv = demoProducts.find(item => item.slug === "lg-oled-c6-65-tv")!;
  expect(searchCatalog([tv], "TVs no larger than 65 inches")).toEqual([tv]);
  expect(searchCatalog([tv], "TVs no larger than 64 inches")).toEqual([]);
});

test.each([
  ["Roku streaming dongle", "roku-streaming-stick-plus"],
  ["Logitech wireless ergonomic mouse", "logitech-mx-master-3s"],
  ["Yeti insulated travel cup", "yeti-rambler-30-tumbler"],
  ["Coleman tent for four people", "coleman-sundome-4"],
  ["Vortex 10 by 42 binoculars", "vortex-diamondback-hd-10x42"],
  ["Weber charcoal barbecue", "weber-original-kettle-22"],
  ["Little Giant folding stepladder", "little-giant-flip-n-lite-m4"],
  ["Milwaukee stackable toolbox", "milwaukee-packout-large-tool-box"],
  ["Ryobi cordless tire pump", "ryobi-one-plus-inflator"],
  ["RIDGID shop vac", "ridgid-nxt-6-gallon-vac"],
  ["Hydro Flask straw water bottle 32 ounces", "hydro-flask-flex-straw-32"],
  ["Catit cat drinking fountain", "catit-flower-fountain"],
  ["Cuisinart icecream machine", "cuisinart-ice-21-ice-cream-maker"],
  ["Vitamin C supplements by Nature Made", "nature-made-vitamin-c-tablets"],
  ["Milani pencil eyeliner black", "milani-stay-put-eyeliner"],
  ["OOLY paint kit for kids", "ooly-ocean-watercolor-kit"],
  ["Timbuk2 laptop rucksack", "timbuk2-division-backpack"],
  ["Exploding Kittens original edition cardgame", "exploding-kittens-original"],
  ["Starbucks gc twenty-five", "starbucks-25-gift-card"],
  ["PlayStation five gaming console", "playstation-5-slim"],
  ["Apple in ear noise cancelling headphones", "airpods-pro"],
  ["Ninja air fryer four quarts", "ninja-af101-air-fryer"],
  ["KitchenAid stand mixer five quarts", "kitchenaid-artisan-5qt-mixer"],
  ["Samsung and LG 65 inch TVs", "lg-oled-c6-65-tv"]
])("finds the expected listing for %s", (query, slug) => {
  expect(searchCatalog(demoProducts, query)[0]?.slug).toBe(slug);
});

test.each([
  ["gift cards with 1 ticket left", "gift cards exactly 1 ticket left"],
  ["gift cards with 1 entry left", "gift cards with 1 ticket left"],
  ["gift cards under $75 with fewer than 5 tickets left", "gift cards under $75 fewer than 5 tickets left"],
  ["gift cards with fewer than 5 tickets left under $75", "gift cards under $75 with fewer than 5 tickets left"],
  ["gift cards with 2 to 5 tickets left under $75", "gift cards under $75 with between 2 and 5 tickets left"],
  ["gift cards from both Amazon and Walmart under $50", "gift cards from Amazon or Walmart under $50"],
  ["gift cards from Amazon worth $25 or $50", "$25 or $50 gift cards from Amazon"],
  ["gift cards except Amazon below $50", "gift cards below $50 except Amazon"],
  ["$25 gift cards from Amazon or Walmart", "Amazon or Walmart $25 gift cards"],
])("keeps the constraints in %s", (query, equivalent) => {
  const matches = searchCatalog(demoProducts, query).map(product => product.slug).sort();
  expect(matches.length).toBeGreaterThan(0);
  expect(matches).toEqual(searchCatalog(demoProducts, equivalent).map(product => product.slug).sort());
});

test("an entry count has no prize-value filter", () => {
  const query = "gift cards with at least 10 tickets left";
  expect(searchDenominations(query, demoProducts).budget).toBeNull();
  const matches = searchCatalog(demoProducts, query);
  expect(matches.length).toBeGreaterThan(0);
  expect(matches.every(product => product.capacity - product.sold >= 10)).toBe(true);
});

test.each([
  ["gift cards from Amazon between $25 and $50", "gift cards between $25 and $50 from Amazon"],
  ["gift cards from Walmart, Target, and Amazon", "gift cards from Walmart, Target, or Amazon"],
  ["Nintendo Switch with $1 entry price", "Nintendo Switch $1 per entry"],
])("keeps the requested scope in %s", (query, equivalent) => {
  const slugs = (term: string) => searchCatalog(demoProducts, term).map(product => product.slug).sort();
  expect(slugs(query).length).toBeGreaterThan(0);
  expect(slugs(query)).toEqual(slugs(equivalent));
});

test("a common budget applies to both named product alternatives", () => {
  const first = searchCatalog(demoProducts, "PlayStation or Nintendo under $500");
  const second = searchCatalog(demoProducts, "Nintendo or PlayStation under $500");
  expect(first.map(product => product.slug).sort()).toEqual(second.map(product => product.slug).sort());
  expect(first.length).toBeGreaterThan(0);
  expect(first.every(product => product.value < 500)).toBe(true);
});

test("keeps the retailer and gift-card scope for alternate amounts and few tickets", () => {
  const matches = searchCatalog(demoProducts, "Amazon gift cards $25 or $50 with fewer than 5 tickets left");
  expect(matches.length).toBeGreaterThan(0);
  expect(matches.every(product => product.retailer === "Amazon" && product.slug.endsWith("-gift-card")
    && [25, 50].includes(product.value) && product.capacity - product.sold < 5)).toBe(true);
});

test.each([
  ["prizes with one ticket left", "1 ticket left"],
  ["2–5 tickets remaining", "2 to 5 tickets left"],
  ["no more than 5 spots remaining", "at most 5 tickets left"],
  ["Walmart gift cards fewer than five tickets left", "Walmart gift cards fewer than 5 tickets left"],
  ["Sony 1 dollar tickets", "Sony $1 per ticket"],
])("normalizes %s without a prize-value constraint", (query, equivalent) => {
  const slugs = (term: string) => searchCatalog(demoProducts, term).map(product => product.slug).sort();
  const matches = slugs(query);
  expect(matches.length).toBeGreaterThan(0);
  expect(matches).toEqual(slugs(equivalent));
  expect(searchDenominations(query, demoProducts).values.size).toBe(0);
});

test("an excluded denomination applies to every retailer in the list", () => {
  const first = searchCatalog(demoProducts, "gift cards excluding $25 from Walmart and Target");
  const last = searchCatalog(demoProducts, "gift cards from Walmart and Target excluding $25");
  expect(first.length).toBeGreaterThan(0);
  expect(first.every(product => product.value !== 25 && ["Walmart", "Target"].some(retailer => matchesCatalogMerchant(product.retailer, retailer)))).toBe(true);
  expect(first.map(product => product.slug).sort()).toEqual(last.map(product => product.slug).sort());
});
