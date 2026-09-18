import { describe, expect, test } from "vitest";
import { demoProducts } from "./demo-products";
import { marketplaceCategoryHref, productMatchesMarketplaceCategory } from "./navigation";

describe("Gas marketplace category", () => {
  test("contains the four supplied fuel and convenience brands", () => {
    const gasProducts = demoProducts.filter(product => productMatchesMarketplaceCategory(product, "gas"));

    expect(gasProducts.map(product => product.brand)).toEqual([
      "BP",
      "Pilot Flying J",
      "Sheetz",
      "Speedway",
    ]);
  });

  test("each Gas card opens a real item page", () => {
    const gasProducts = demoProducts.filter(product => productMatchesMarketplaceCategory(product, "gas"));

    expect(gasProducts.map(product => `/items/${product.slug}`)).toEqual([
      "/items/bp-100-gift-card",
      "/items/pilot-flying-j-150-gift-card",
      "/items/sheetz-75-gift-card",
      "/items/speedway-50-gift-card",
    ]);
    expect(marketplaceCategoryHref("gas")).toBe("/browse?category=gas");
  });
});
