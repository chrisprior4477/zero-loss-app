import { expect, test } from "vitest";
import { getDemoProduct } from "./demo-products";
import { groceryStoreFirst } from "./grocery-order";

test("grocery-store gift cards lead pictured Walmart items and coffee without losing or changing offers", () => {
  const publix = getDemoProduct("publix-100-gift-card")!;
  const baby = getDemoProduct("babys-essentials-bundle")!;
  const coffee = { ...publix, slug: "coffee", title: "$100 Coffee Gift Card", retailer: "Dutch Bros Coffee®" };
  const walmart = { ...publix, slug: "walmart-card", title: "$100 Walmart Gift Card", retailer: "Walmart" };
  const safeway = { ...publix, slug: "safeway-card", title: "$100 Safeway Gift Card", retailer: "Safeway" };
  const input = [coffee, baby, safeway, publix, walmart];
  const result = groceryStoreFirst(input, ["Safeway", "Publix"]);
  expect(result).toEqual([safeway, publix, walmart, baby, coffee]);
  expect(input).toEqual([coffee, baby, safeway, publix, walmart]);
  expect(result.find(item => item.slug === publix.slug)).toBe(publix);
});
