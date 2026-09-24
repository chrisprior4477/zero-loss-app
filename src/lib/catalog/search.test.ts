import { describe, expect, test } from "vitest";
import { demoProducts, type DemoProduct } from "./demo-products";
import { searchCatalog, searchCatalogMatches } from "./search";

describe("catalog search", () => {
  test("matches familiar product words and synonyms", () => {
    expect(searchCatalog(demoProducts, "TV").map(product => product.slug)).toEqual(expect.arrayContaining([
      "samsung-m70h-tv",
      "lg-oled-c6-65-tv",
    ]));
    expect(searchCatalog(demoProducts, "sneakers")[0]?.slug).toBe("nike-court-shot-shoes");
    expect(searchCatalog(demoProducts, "shoes")[0]?.slug).toBe("nike-court-shot-shoes");
  });

  test("matches brands and marketplace categories", () => {
    expect(searchCatalog(demoProducts, "gas").map(product => product.brand)).toEqual(["BP", "Pilot Flying J", "Speedway", "Sheetz"]);
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
    expect(matches).toHaveLength(4);
    expect(matches.every(match => match.product.retailer === "The Home Depot" && match.kind === "retailer")).toBe(true);
  });

  test.each(["pet food", "pet treats", "dog food", "cat treats", "puppy food", "pet supplies"])("offers PetSmart instead of unrelated groceries for %s", query => {
    const matches = searchCatalogMatches(demoProducts, query);
    expect(matches).toHaveLength(4);
    expect(matches.every(match => match.product.retailer === "PetSmart" && match.kind === "retailer")).toBe(true);
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
