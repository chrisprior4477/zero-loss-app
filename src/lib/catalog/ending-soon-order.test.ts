import { expect, test } from "vitest";
import { placeEndingSoonShowcases } from "./ending-soon-order";

const card = (slug: string, remaining = 1) => ({ item: { href: `/items/${slug}` }, remaining });

test("Dunkin sits between Baby Essentials and Walmart after a one-slot replay", () => {
  const cards = [card("dunkin-25-gift-card"), card("best-buy-100-gift-card", 5),
    card("babys-essentials-bundle"), card("walmart-100-gift-card"), card("nike-court-shot-shoes")];
  expect(placeEndingSoonShowcases(cards).map(({ item }) => item.href)).toEqual([
    "/items/babys-essentials-bundle", "/items/dunkin-25-gift-card",
    "/items/walmart-100-gift-card", "/items/best-buy-100-gift-card",
    "/items/nike-court-shot-shoes",
  ]);
});

test("does not resurrect a resolved or full showcase card", () => {
  const withoutDunkin = [card("babys-essentials-bundle"), card("walmart-100-gift-card")];
  expect(placeEndingSoonShowcases(withoutDunkin)).toEqual(withoutDunkin);
  const fullDunkin = [card("babys-essentials-bundle"), card("walmart-100-gift-card"), card("dunkin-25-gift-card", 0)];
  expect(placeEndingSoonShowcases(fullDunkin)).toEqual(fullDunkin);
});
