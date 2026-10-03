import { describe, expect, test } from "vitest";
import { demoProducts } from "./demo-products";
import { giftCardPartnerGroups } from "./gift-card-partners";
import { retailerFilterGroups } from "./browse-filters";
import { searchRetailerDirectory } from "./retailer-directory-search";

const groups = retailerFilterGroups(giftCardPartnerGroups, demoProducts);

describe("retailer directory search", () => {
  test.each(["auto", "automotive", "spark plug", "spark plugs", "AutoZone"])("finds Automotive for %s", query => {
    expect(searchRetailerDirectory(groups, query)[0]?.id).toBe("automotive");
  });

  test("finds other directory categories from brand and shopping terms", () => {
    expect(searchRetailerDirectory(groups, "Wayfair")[0]?.id).toBe("home-furnishings");
    expect(searchRetailerDirectory(groups, "Home Depot")[0]?.id).toBe("home-improvement");
    expect(searchRetailerDirectory(groups, "power tools")[0]?.id).toBe("home-improvement");
    expect(searchRetailerDirectory(groups, "baby")[0]?.id).toBe("babies-and-kids");
  });

  test("does not invent directory matches for unrelated or excessive queries", () => {
    expect(searchRetailerDirectory(groups, "kayak")).toEqual([]);
    expect(searchRetailerDirectory(groups, "x".repeat(121))).toEqual([]);
    expect(searchRetailerDirectory(groups, "a")).toEqual([]);
  });
});
