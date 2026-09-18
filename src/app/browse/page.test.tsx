import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import BrowsePage from "./page";

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
});
