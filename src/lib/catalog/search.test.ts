import { describe, expect, test } from "vitest";
import { demoProducts, type DemoProduct } from "./demo-products";
import { searchCatalog, searchCatalogMatches } from "./search";

describe("catalog search", () => {
  test.each(["auto", "atuo", "automot", "automotvie"])("finds every automotive vendor for %s", query => {
    const retailers = searchCatalog(demoProducts, query).map(product => product.retailer);
    expect(retailers).toEqual(expect.arrayContaining(["AutoZone®", "Jiffy Lube®", "Turo"]));
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
  });

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
    expect(matches.every(match => ["PetSmart", "Petco", "Chewy®", "1-800-PetSupplies.com"].includes(match.product.retailer) && match.kind === "retailer")).toBe(true);
  });

  test.each(["medicine", "medication", "meds", "cold medicine"])("offers existing CVS and Walmart cards for %s", query => {
    const matches = searchCatalogMatches(demoProducts, query);
    expect(matches).toHaveLength(9);
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
    expect(products).toHaveLength(4);
    expect(products.every(product => product.retailer === "PetSmart")).toBe(true);
  });

  test.each(["baby spaceship", "pet reciprocating saw", "reciprocating saw underwater", "pineapple", "", "stuff", "please find me somethingz", "x".repeat(513)])("does not discard meaningful unknown words or invent matches for %s", query => {
    expect(searchCatalog(demoProducts, query)).toEqual([]);
  });

  test("preserves brand intent instead of expanding brands into competitors", () => {
    expect(searchCatalog(demoProducts, "Starbucks").every(product => product.brand === "Starbucks")).toBe(true);
    expect(searchCatalog(demoProducts, "Nintendo").some(product => product.slug === "playstation-5-slim")).toBe(false);
    expect(searchCatalog(demoProducts, "PetSmart $25").map(product => product.slug)).toEqual(["petsmart-25-gift-card"]);
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
