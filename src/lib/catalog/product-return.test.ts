import { expect, test } from "vitest";
import { freeEntryHref, productBrowseReturnHref, productBrowseReturnLabel, productHrefWithBrowseReturn } from "./product-return";
import { popularRewardBrands } from "./popular-rewards";

test("product links carry their exact marketplace category or search", () => {
  expect(productHrefWithBrowseReturn("dyson-v8-cordless-vacuum", "/browse?category=home-essentials&available=1"))
    .toBe("/items/dyson-v8-cordless-vacuum?from=%2Fbrowse%3Fcategory%3Dhome-essentials%26available%3D1");
  expect(productBrowseReturnLabel("/browse?sort=ending-soon")).toBe("Ending Soon");
  expect(productBrowseReturnLabel("/browse?category=groceries")).toBe("Groceries");
  expect(productBrowseReturnLabel("/browse?q=coffee")).toBe("Search results");
});

test("a product cannot use an external or unrelated return destination", () => {
  for (const value of [undefined, "https://evil.test/browse", "//evil.test/browse", "/account/wallet", "/browse#fake", "/browse?next=https://evil.test", "/rewards/unknown", "/rewards/nintendo?next=https://evil.test", "/rewards/nintendo#other", "//evil.test/rewards/nintendo"]) {
    expect(productBrowseReturnHref(value)).toBe("/browse");
    expect(new URL(freeEntryHref("airpods-pro", value), "https://example.test").searchParams.has("from")).toBe(false);
  }
});

test.each(popularRewardBrands)("$name products return to that retailer's reward choices", brand => {
  const destination = `/rewards/${brand.slug}`;
  expect(productBrowseReturnHref(destination)).toBe(destination);
  expect(productBrowseReturnLabel(destination)).toBe(`${brand.name} rewards`);
  expect(new URL(freeEntryHref(`${brand.slug}-25-gift-card`, destination), "https://example.test").searchParams.get("from")).toBe(destination);
});

test("free-entry links retain the complete shopping search and filters", () => {
  const browse = "/browse?category=electronics&sort=fewest-left&q=wireless&type=pictured";
  const href = new URL(freeEntryHref("airpods-pro", browse), "https://example.test");
  expect(href.searchParams.get("offering")).toBe("airpods-pro");
  expect(href.searchParams.get("from")).toBe(browse);
});

test("grocery previews return to the chosen layout without allowing arbitrary preview parameters", () => {
  for (const layout of ["1", "2", "3"]) {
    const browse = `/browse?category=groceries&inspiration=${layout}`;
    const product = new URL(productHrefWithBrowseReturn("publix-100-gift-card", browse), "https://example.test");
    expect(product.searchParams.get("from")).toBe(browse);
    expect(productBrowseReturnLabel(browse)).toBe("Groceries");
  }
  expect(productBrowseReturnHref("/browse?category=groceries&inspiration=https://evil.test")).toBe("/browse");
});
