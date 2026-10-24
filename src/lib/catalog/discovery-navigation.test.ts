import { expect, test } from "vitest";
import { discoveryCategoryHref } from "./discovery-navigation";
import { parseBrowseFilterState } from "./browse-filters";

test("category selection preserves Ending Soon, value, availability and sort", () => {
  const filters = parseBrowseFilterState({ category: "ending-soon", type: "gift-cards", available: "1", maxValue: "100" }, []);
  expect(discoveryCategoryHref("automotive", filters, "ending-soon"))
    .toBe("/browse?category=ending-soon&partnerCategory=automotive&type=gift-cards&available=1&maxValue=100&sort=fewest-left#search-results");
});

test("switching departments clears a conflicting marketplace category and retailer", () => {
  const filters = parseBrowseFilterState({ retailer: "Walmart" }, ["Walmart"]);
  expect(discoveryCategoryHref("automotive", filters, "groceries")).toBe("/browse?partnerCategory=automotive#search-results");
  expect(discoveryCategoryHref("automotive", filters, null, "AutoZone®"))
    .toBe("/browse?partnerCategory=automotive&retailer=AutoZone%C2%AE#search-results");
});
