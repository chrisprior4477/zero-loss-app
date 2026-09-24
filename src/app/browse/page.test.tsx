import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import BrowsePage from "./page";

afterEach(cleanup);

describe("Browse search results", () => {
  test("shows matching catalog items for familiar wording", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "TV" }) }));

    expect(screen.getByRole("heading", { name: "Search results" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Samsung 50.*M70H Mini LED 4K Smart TV/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /65-inch LG OLED evo AI C6 4K Smart TV/i })).toBeTruthy();
  });

  test("shows the product-request path when nothing matches", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "kayak" }) }));

    expect(screen.getByRole("heading", { name: "We don't have “kayak” in the catalog yet." })).toBeTruthy();
    expect(screen.getByText(/Shopping should never feel like a/i)).toBeTruthy();
    expect(screen.getByText("loss.").className).toContain("text-[#31e800]");
    expect(screen.getByRole("link", { name: /Tell us what you'd like to see/i }).getAttribute("href")).toBe("/contact/product-request?product=kayak");
  });

  test("finds baby essentials using everyday language", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "baby stuff" }) }));
    expect(screen.getByRole("link", { name: /Baby's Essentials Bundle/i }).getAttribute("href")).toBe("/items/babys-essentials-bundle");
  });

  test("clearly identifies indirect retailer results as gift cards", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "reciprocating saw" }) }));
    expect(screen.getAllByText("Related retailer gift card · Check retailer product availability.")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /\$25 The Home Depot Gift Card/i }).getAttribute("href")).toBe("/items/home-depot-25-gift-card");
    expect(screen.queryByRole("heading", { name: "Reciprocating Saw" })).toBeNull();
  });
});
