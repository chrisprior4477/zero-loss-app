import { describe, expect, test } from "vitest";
import { demoProducts } from "./demo-products";
import { browseRetailers, filterBrowseProducts, parseBrowseFilterState, retailerFilterGroups } from "./browse-filters";
import { giftCardPartnerGroups } from "./gift-card-partners";

const filters = { type: "all" as const, retailer: "", availableOnly: false, sort: "featured" as const };

describe("browse filters", () => {
  test("retains every supplied GiftCard Partners category and brand", () => {
    expect(giftCardPartnerGroups).toHaveLength(18);
    expect(giftCardPartnerGroups.reduce((total, group) => total + group.brands.length, 0)).toBe(342);
    expect(giftCardPartnerGroups.find(group => group.category === "Automotive")?.brands).toContain("AutoZone®");
    expect(giftCardPartnerGroups.find(group => group.category === "Specialty Retail")?.brands).toContain("Best Buy®");
  });

  test("maps provider names to current offers without claiming all brands have listings", () => {
    const groups = retailerFilterGroups(giftCardPartnerGroups, demoProducts);
    const bestBuy = groups.find(group => group.category === "Specialty Retail")?.options.find(option => option.label === "Best Buy®");
    const autoZone = groups.find(group => group.category === "Automotive")?.options.find(option => option.label === "AutoZone®");
    expect(bestBuy).toEqual({ label: "Best Buy®", value: "Best Buy", hasOffer: true });
    expect(autoZone).toEqual({ label: "AutoZone®", value: "AutoZone®", hasOffer: false });
    expect(groups.find(group => group.category === "Other current offers")?.options.some(option => option.value === "Netflix")).toBe(true);
  });

  test("uses the catalog retailer list and validates selected options", () => {
    const retailers = browseRetailers(demoProducts);
    expect(retailers).toContain("Best Buy");
    expect(retailers).toContain("Walmart");
    expect(parseBrowseFilterState({ retailer: "Best Buy", type: "gift-cards", available: "1", sort: "price-low" }, retailers))
      .toEqual({ type: "gift-cards", retailer: "Best Buy", availableOnly: true, sort: "price-low" });
    expect(parseBrowseFilterState({ retailer: "made up", type: "bad", sort: "bad" }, retailers)).toEqual(filters);
  });

  test("filters pictured products, gift cards, retailer, and current availability", () => {
    const products = demoProducts.slice(0, 15);
    const pictured = filterBrowseProducts(products, { ...filters, type: "pictured" });
    const giftCards = filterBrowseProducts(products, { ...filters, type: "gift-cards" });
    expect(pictured.length + giftCards.length).toBe(products.length);
    const full = { ...products[0], sold: products[0].capacity };
    expect(filterBrowseProducts([full], { ...filters, availableOnly: true })).toHaveLength(0);
    expect(filterBrowseProducts(products, { ...filters, retailer: "Walmart" }).every(product => product.retailer === "Walmart")).toBe(true);
  });

  test("sorts by live capacity, entry price, or value without mutating source products", () => {
    const first = { ...demoProducts[0], sold: 9, capacity: 10, entryPrice: 3, value: 50 };
    const second = { ...demoProducts[1], sold: 3, capacity: 10, entryPrice: 1, value: 100 };
    const products = [second, first];
    expect(filterBrowseProducts(products, { ...filters, sort: "fewest-left" }, "query")[0]).toBe(first);
    expect(filterBrowseProducts(products, { ...filters, sort: "price-low" })[0]).toBe(second);
    expect(filterBrowseProducts(products, { ...filters, sort: "value-high" })[0]).toBe(second);
    expect(products).toEqual([second, first]);
  });
});
