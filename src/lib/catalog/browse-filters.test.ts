import { describe, expect, test } from "vitest";
import { demoProducts } from "./demo-products";
import { browseRetailers, filterBrowseProducts, parseBrowseFilterState, retailerFilterGroups } from "./browse-filters";
import { giftCardPartnerGroups } from "./gift-card-partners";

const filters = { type: "all" as const, retailer: "", availableOnly: false, sort: "featured" as const, minValue: null, maxValue: null };

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

  test("splits grocery, convenience, pharmacy, and gas into separate usable categories", () => {
    const groups = retailerFilterGroups(giftCardPartnerGroups, demoProducts);
    expect(groups.map(group => group.id)).toEqual(expect.arrayContaining(["groceries", "convenience", "pharmacy", "gas", "other-current-offers"]));
    expect(groups.some(group => group.category === "Grocery, Convenience, Pharmacy & Gas")).toBe(false);
    expect(groups.some(group => group.category === "Cryptocurrency")).toBe(false);
    expect(groups.find(group => group.id === "groceries")?.options.some(option => option.label === "Publix")).toBe(true);
    expect(groups.find(group => group.id === "pharmacy")?.options.some(option => option.label === "CVS®")).toBe(true);
    expect(groups.find(group => group.id === "gas")?.options.some(option => option.label === "BP")).toBe(true);
    expect(groups.find(group => group.id === "convenience")?.options.some(option => option.label === "Sheetz")).toBe(true);
  });

  test("splits home vendors between furnishings and improvement without losing any", () => {
    const groups = retailerFilterGroups(giftCardPartnerGroups, demoProducts);
    const furnishings = groups.find(group => group.id === "home-furnishings");
    const improvement = groups.find(group => group.id === "home-improvement");
    const original = giftCardPartnerGroups.find(group => group.category === "Home Furnishings & Improvement")?.brands ?? [];
    expect(groups.some(group => group.category === "Home Furnishings & Improvement")).toBe(false);
    expect(furnishings?.options.map(option => option.label)).toContain("Wayfair");
    expect(improvement?.options.map(option => option.label)).toContain("The Home Depot®");
    expect([...(furnishings?.options ?? []), ...(improvement?.options ?? [])].map(option => option.label).sort())
      .toEqual([...original].sort());
  });

  test("uses the catalog retailer list and validates selected options", () => {
    const retailers = browseRetailers(demoProducts);
    expect(retailers).toContain("Best Buy");
    expect(retailers).toContain("Walmart");
    expect(parseBrowseFilterState({ retailer: "Best Buy", type: "gift-cards", available: "1", sort: "price-low" }, retailers))
      .toEqual({ type: "gift-cards", retailer: "Best Buy", availableOnly: true, sort: "price-low", minValue: null, maxValue: null });
    expect(parseBrowseFilterState({ retailer: "made up", type: "bad", sort: "bad" }, retailers)).toEqual(filters);
  });

  test("validates prize-value bounds from the URL", () => {
    const retailers = browseRetailers(demoProducts);
    expect(parseBrowseFilterState({ maxValue: "50", minValue: "25.50" }, retailers))
      .toMatchObject({ minValue: 25.5, maxValue: 50 });
    expect(parseBrowseFilterState({ minValue: "-1", maxValue: "Infinity" }, retailers))
      .toMatchObject({ minValue: null, maxValue: null });
    expect(parseBrowseFilterState({ minValue: "5.999", maxValue: "1000001" }, retailers))
      .toMatchObject({ minValue: null, maxValue: null });
  });

  test("filters pictured products, gift cards, retailer, and current availability", () => {
    const products = demoProducts.slice(0, 15);
    const pictured = filterBrowseProducts(products, { ...filters, type: "pictured" });
    const giftCards = filterBrowseProducts(products, { ...filters, type: "gift-cards" });
    expect(pictured.length + giftCards.length).toBe(products.length);
    const full = { ...products[0], sold: products[0].capacity };
    expect(filterBrowseProducts([full], { ...filters, availableOnly: true })).toHaveLength(0);
    expect(filterBrowseProducts(products, { ...filters, retailer: "Walmart" }).every(product => product.retailer === "Walmart")).toBe(true);
    const specialty = retailerFilterGroups(giftCardPartnerGroups, demoProducts).find(group => group.id === "specialty-retail");
    const specialtyRetailers = new Set(specialty?.options.filter(option => option.hasOffer).map(option => option.value));
    const specialtyProducts = filterBrowseProducts(demoProducts, filters, "", false, specialtyRetailers);
    expect(specialtyProducts.length).toBeGreaterThan(0);
    expect(specialtyProducts.every(product => specialtyRetailers.has(product.retailer))).toBe(true);
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

  test("filters by inclusive prize value independently of entry price", () => {
    const low = { ...demoProducts[0], value: 25, entryPrice: 3 };
    const middle = { ...demoProducts[1], value: 75, entryPrice: 1 };
    const high = { ...demoProducts[2], value: 150, entryPrice: 1 };
    expect(filterBrowseProducts([low, middle, high], { ...filters, maxValue: 75 }))
      .toEqual([low, middle].sort((a, b) => a.title.localeCompare(b.title)));
    expect(filterBrowseProducts([low, middle, high], { ...filters, minValue: 50, maxValue: 100 }))
      .toEqual([middle]);
  });
});
