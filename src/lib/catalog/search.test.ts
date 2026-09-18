import { describe, expect, test } from "vitest";
import { demoProducts } from "./demo-products";
import { searchCatalog } from "./search";

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
});
