import { expect, test } from "vitest";
import { productBrowseReturnHref, productBrowseReturnLabel, productHrefWithBrowseReturn } from "./product-return";

test("product links carry their exact marketplace category or search", () => {
  expect(productHrefWithBrowseReturn("dyson-v8-cordless-vacuum", "/browse?category=home-essentials&available=1"))
    .toBe("/items/dyson-v8-cordless-vacuum?from=%2Fbrowse%3Fcategory%3Dhome-essentials%26available%3D1");
  expect(productBrowseReturnLabel("/browse?sort=ending-soon")).toBe("Ending Soon");
  expect(productBrowseReturnLabel("/browse?category=groceries")).toBe("Groceries");
  expect(productBrowseReturnLabel("/browse?q=coffee")).toBe("Search results");
});

test("a product cannot use an external or unrelated return destination", () => {
  for (const value of [undefined, "https://evil.test/browse", "//evil.test/browse", "/account/wallet", "/browse#fake", "/browse?next=https://evil.test"]) {
    expect(productBrowseReturnHref(value)).toBe("/browse");
  }
});
