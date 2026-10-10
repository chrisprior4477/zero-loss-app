import { expect, test } from "vitest";
import { demoProducts } from "./demo-products";
import { prizeNumberForSlug } from "./prize-number";

test("a prize keeps one stable display number across all of its entries", () => {
  expect(prizeNumberForSlug("publix-100-gift-card")).toBe("PRZ-1989583781");
  expect(prizeNumberForSlug("publix-100-gift-card")).toBe(prizeNumberForSlug("publix-100-gift-card"));
});

test("current demo prizes have distinct display numbers", () => {
  const numbers = demoProducts.map(product => prizeNumberForSlug(product.slug));
  expect(new Set(numbers).size).toBe(numbers.length);
});
