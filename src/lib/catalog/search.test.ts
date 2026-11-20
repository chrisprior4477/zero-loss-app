import { describe, expect, test } from "vitest";
import { demoProducts, type DemoProduct } from "./demo-products";
import { searchCatalog, searchCatalogMatches } from "./search";

describe("catalog search", () => {
  test("matches compact storage units, leading price ceilings, and retailer exclusions", () => {
    expect(searchCatalog(demoProducts, "Sony PS5 Slim 1TB").some(item => item.slug === "playstation-5-slim")).toBe(true);
    expect(searchCatalog(demoProducts, "Amazon max $75")).toEqual(searchCatalog(demoProducts, "Amazon up to $75"));
    const withoutAmazon = searchCatalog(demoProducts, "gift cards below $75 excluding Amazon");
    expect(withoutAmazon.length).toBeGreaterThan(0);
    expect(withoutAmazon.every(item => item.value < 75 && item.retailer !== "Amazon")).toBe(true);
  });
  test("keeps each alternative independent and supports explicit gift-card exclusions", () => {
    const list = searchCatalog(demoProducts, "TV, monitor, or headphones").map(item => item.slug);
    expect(list).toEqual(expect.arrayContaining(["lg-oled-c6-65-tv", "sony-wh-1000xm5-headphones"]));
    const mixed = searchCatalog(demoProducts, "TV under $1,000 or headphones").map(item => item.slug);
    expect(mixed).toContain("sony-wh-1000xm5-headphones");
    expect(mixed).not.toContain("lg-oled-c6-65-tv");
    expect(searchCatalog(demoProducts, "Sony headphones not gift cards").map(item => item.slug)).toEqual(["sony-wh-1000xm5-headphones"]);
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
