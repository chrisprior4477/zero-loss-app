import { expect, test } from "vitest";
import { favoriteSlugFromHref } from "./navigation";

test("uses only direct catalog product links for favorites", () => {
  expect(favoriteSlugFromHref("/items/dyson-v8-cordless-vacuum")).toBe("dyson-v8-cordless-vacuum");
  for (const href of ["/items", "/items/", "/items/TV", "/items/product?redirect=bad", "https://evil.test/items/product", "/browse", "/items/product/extra", undefined]) {
    expect(favoriteSlugFromHref(href)).toBeNull();
  }
});
