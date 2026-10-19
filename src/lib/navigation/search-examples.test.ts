import { expect, test } from "vitest";
import { searchExamples, searchResultsHref } from "./search-examples";
import { searchCatalog } from "@/lib/catalog/search";
import { demoProducts } from "@/lib/catalog/demo-products";
test.each(searchExamples)("%s has catalog matches and uses the item landing anchor", example => {
  expect(searchCatalog(demoProducts, example).length).toBeGreaterThan(0);
  const target = new URL(searchResultsHref(example), "https://preview.invalid");
  expect(target.searchParams.get("q")).toBe(example);
  expect(target.hash).toBe("#search-results");
});
