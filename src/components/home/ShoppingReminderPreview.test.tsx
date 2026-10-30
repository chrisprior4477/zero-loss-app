import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readEntryIntent, saveEntryIntent } from "@/lib/entries/return-intent";
import { ShoppingReminderPreview } from "./ShoppingReminderPreview";

const product = { slug: "playstation-5-slim", title: "PlayStation 5 Slim Model", image: "/dollar-choice-gaming.png" };
afterEach(() => { cleanup(); sessionStorage.clear(); });

test("viewing preview returns to the product without implying an entry", () => {
  render(<ShoppingReminderPreview variant="viewed" product={product} />);
  expect(screen.getByRole("link", { name: "Back to this product" }).getAttribute("href")).toBe("/items/playstation-5-slim");
  expect(screen.queryByText("Not submitted")).toBeNull();
  expect(readEntryIntent()).toBeNull();
});

test("entry preview explicitly marks an unfinished selection and returns to entry controls", () => {
  render(<ShoppingReminderPreview variant="entry" product={product} />);
  expect(screen.getByText("Not submitted")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Continue your entry" }).getAttribute("href")).toBe("/items/playstation-5-slim#enter-entry");
  expect(readEntryIntent()).toBeNull();
});

test("closing and replaying either preview preserves the shopper's real saved selection", () => {
  saveEntryIntent("samsung-m70h-tv", "Samsung TV", 4);
  const savedIntent = readEntryIntent();
  const { rerender } = render(<ShoppingReminderPreview key="viewed" variant="viewed" product={product} />);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss reminder" }));
  expect(screen.queryByRole("complementary")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show again" }));
  expect(screen.getByRole("complementary")).toBeTruthy();
  rerender(<ShoppingReminderPreview key="entry" variant="entry" product={product} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Dismiss reminder" }), { key: "Escape" });
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(readEntryIntent()).toEqual(savedIntent);
});
