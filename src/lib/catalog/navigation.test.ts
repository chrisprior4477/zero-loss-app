import { describe, expect, test } from "vitest";
import { demoProducts } from "./demo-products";
import { isGiftCardListing, marketplaceCategoryHref, productMatchesMarketplaceCategory } from "./navigation";

test("distinguishes pictured merchandise from gift-card artwork", () => {
  expect(isGiftCardListing(demoProducts.find(product => product.slug === "babys-essentials-bundle")!)).toBe(false);
  expect(isGiftCardListing(demoProducts.find(product => product.slug === "dyson-v8-cordless-vacuum")!)).toBe(false);
  expect(isGiftCardListing(demoProducts.find(product => product.slug === "home-style-50-gift-card-bundle")!)).toBe(true);
});

describe("Gas marketplace category", () => {
  test("contains the four supplied fuel and convenience brands", () => {
    const gasProducts = demoProducts.filter(product => productMatchesMarketplaceCategory(product, "gas"));

    expect([...new Set(gasProducts.map(product => product.brand))]).toEqual([
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
      "/items/directory-pilot-flying-j-100-gift-card",
      "/items/directory-speedway-100-gift-card",
      "/items/directory-sheetz-100-gift-card",
    ]);
    expect(marketplaceCategoryHref("gas")).toBe("/browse?category=gas");
  });
});

test("almost-full category includes only open pools at least 90% filled", () => {
  const nearFull = { ...demoProducts[0], capacity: 100, sold: 90 };
  expect(productMatchesMarketplaceCategory(nearFull, "ending-soon")).toBe(true);
  expect(productMatchesMarketplaceCategory({ ...nearFull, sold: 89 }, "ending-soon")).toBe(false);
  expect(productMatchesMarketplaceCategory({ ...nearFull, sold: 100 }, "ending-soon")).toBe(false);
  expect(marketplaceCategoryHref("almost full")).toBe("/browse?sort=ending-soon");
});

test("Movie Night links to the curated TV, streaming, theater and popcorn offerings", () => {
  expect(marketplaceCategoryHref("Movie Night")).toBe("/browse?category=movie-night");
  const found = demoProducts.filter(product => productMatchesMarketplaceCategory(product, "movie-night"));
  expect(found.map(product => product.slug).sort()).toEqual([
    "samsung-m70h-tv", "lg-oled-c6-65-tv", "netflix-25-gift-card",
    "directory-hulu-100-gift-card", "directory-paramount-100-gift-card",
    "directory-amc-theaters-100-gift-card", "directory-cinemark-100-gift-card",
    "directory-fandango-100-gift-card", "directory-regal-100-gift-card",
    "directory-the-popcorn-factory-100-gift-card",
  ].sort());
});
