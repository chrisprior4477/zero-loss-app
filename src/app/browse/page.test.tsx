import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import BrowsePage from "./page";

vi.mock("@/components/ui/FavoriteButton", () => ({ FavoriteButton: () => null }));

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

  test("uses the available mobile width for one search result", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "dyson v8" }) }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Products" }).className).toContain("grid-cols-1");
  });

  test.each(["everyday-items", "groceries", "electronics", "home-essentials", "ending-soon"])(
    "puts pictured items before gift cards in %s",
    async category => {
      render(await BrowsePage({ searchParams: Promise.resolve(category === "ending-soon" ? { sort: "ending-soon" } : { category }) }));
      const headings = Array.from(document.querySelectorAll('section[aria-label="Products"] article h2'), heading => heading.textContent ?? "");
      const firstGiftCard = headings.findIndex(title => /gift card|bed bath & beyond \+ wayfair bundle/i.test(title));
      expect(firstGiftCard).toBeGreaterThan(0);
      expect(headings.slice(0, firstGiftCard).every(title => !/gift card/i.test(title))).toBe(true);
      expect(headings.slice(firstGiftCard).every(title => /gift card|bed bath & beyond \+ wayfair bundle/i.test(title))).toBe(true);
    },
  );

  test("clearly identifies indirect retailer results as gift cards", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "reciprocating saw" }) }));
    expect(screen.getAllByText("Related retailer gift card · Check retailer product availability.")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /\$25 The Home Depot Gift Card/i }).getAttribute("href")).toBe("/items/home-depot-25-gift-card");
    expect(screen.queryByRole("heading", { name: "Reciprocating Saw" })).toBeNull();
  });

  test("keeps a search term when browsing its categories", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "paper towels" }) }));
    expect(screen.getByRole("link", { name: "Groceries" }).getAttribute("href")).toBe("/browse?category=groceries&q=paper+towels");
    expect(screen.getByRole("link", { name: "All" }).getAttribute("href")).toBe("/browse?q=paper+towels");
    expect(screen.getByRole("button", { name: "Scroll search categories right" })).toBeTruthy();
    expect(screen.getAllByText("Related retailer gift card · Check retailer product availability.")).toHaveLength(9);
  });

  test("does not claim the whole catalog is empty when only a selected category has no matches", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "paper towels", category: "gas" }) }));
    expect(screen.getByRole("heading", { name: "No “paper towels” matches in Gas." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See all search results" }).getAttribute("href")).toBe("/browse?q=paper+towels");
  });
});
