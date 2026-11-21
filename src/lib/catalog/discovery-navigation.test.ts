import { expect, test } from "vitest";
import { discoveryCategoryHref } from "./discovery-navigation";
import { parseBrowseFilterState } from "./browse-filters";

test("category selection preserves Ending Soon, value, availability and sort", () => {
  const filters = parseBrowseFilterState({ category: "ending-soon", type: "gift-cards", available: "1", maxValue: "100" }, []);
  expect(discoveryCategoryHref("automotive", filters, "ending-soon"))
    .toBe("/browse?category=ending-soon&partnerCategory=automotive&type=gift-cards&available=1&maxValue=100&sort=featured#search-results");
});

test("switching departments clears a conflicting marketplace category and retailer", () => {
  const filters = parseBrowseFilterState({ retailer: "Walmart" }, ["Walmart"]);
  expect(discoveryCategoryHref("automotive", filters, "groceries")).toBe("/browse?partnerCategory=automotive#search-results");
  expect(discoveryCategoryHref("automotive", filters, null, "AutoZone®"))
    .toBe("/browse?partnerCategory=automotive&retailer=AutoZone%C2%AE#search-results");
});

test("selecting a retailer keeps the current marketplace category", () => {
  const filters = parseBrowseFilterState({}, []);
  expect(discoveryCategoryHref("specialty-retail", filters, "electronics", "Best Buy"))
    .toBe("/browse?category=electronics&partnerCategory=specialty-retail&retailer=Best+Buy#search-results");
});

test("retailer refinement preserves the Ending Soon ticket range", () => {
  const filters = parseBrowseFilterState({ category: "ending-soon", maxValue: "100" }, []);
  const url = new URL(discoveryCategoryHref("specialty-retail", filters, "ending-soon", "Best Buy", "2-5"), "https://example.test");
  expect(Object.fromEntries(url.searchParams)).toEqual({ category: "ending-soon", partnerCategory: "specialty-retail", retailer: "Best Buy", ticketsLeft: "2-5", maxValue: "100", sort: "featured" });
  expect(discoveryCategoryHref("specialty-retail", filters, "electronics", "Best Buy", "2-5")).not.toContain("ticketsLeft");
});
