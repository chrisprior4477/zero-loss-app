import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RetailerCategoryNav } from "./RetailerCategoryNav";

afterEach(cleanup);

const props = {
  groups: [
    { id: "automotive", category: "Automotive", options: [
      { label: "AutoZone®", value: "AutoZone®", hasOffer: false },
      { label: "Turo", value: "Turo", hasOffer: true },
    ] },
    { id: "groceries", category: "Groceries", options: [
      { label: "Publix", value: "Publix", hasOffer: true },
    ] },
  ],
  selectedGroupId: "groceries",
  selectedCategory: null,
  filters: { type: "pictured" as const, retailer: "Publix", availableOnly: true, sort: "price-low" as const, minValue: 25, maxValue: 100 },
  searchTerm: "card",
  subcategory: "",
};

test("hovering a category reveals only its retailers with working brand filters", () => {
  render(<RetailerCategoryNav {...props} />);
  const nav = within(screen.getByRole("navigation", { name: "Retailer categories" }));
  expect(nav.getByRole("button", { name: "Groceries" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.pointerEnter(nav.getByRole("button", { name: "Automotive" }), { pointerType: "mouse" });
  const panel = within(document.getElementById("retailer-category-panel")!);
  expect(panel.getByRole("heading", { name: "Automotive" })).toBeTruthy();
  expect(panel.queryByRole("link", { name: /Publix/ })).toBeNull();
  const autoZone = new URL(panel.getByRole("link", { name: /AutoZone®/ }).getAttribute("href") ?? "", "https://example.test");
  expect(autoZone.searchParams.get("partnerCategory")).toBe("automotive");
  expect(autoZone.searchParams.get("retailer")).toBe("AutoZone®");
  expect(autoZone.searchParams.get("type")).toBe("pictured");
  expect(autoZone.searchParams.get("available")).toBe("1");
  expect(autoZone.searchParams.get("minValue")).toBe("25");
  expect(autoZone.searchParams.get("maxValue")).toBe("100");
  expect(autoZone.searchParams.get("q")).toBe("card");
  expect(panel.getByRole("link", { name: "See all Automotive" }).getAttribute("href")).not.toContain("retailer=");
});

test("mobile search finds the right category from a retailer name, then tapping expands it", () => {
  render(<RetailerCategoryNav {...props} />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search retailer categories or names" }), { target: { value: "Publix" } });
  const nav = within(screen.getByRole("navigation", { name: "Retailer categories" }));
  expect(nav.queryByRole("button", { name: "Automotive" })).toBeNull();
  fireEvent.click(nav.getByRole("button", { name: "Groceries" }));
  expect(within(document.getElementById("retailer-category-panel")!).getByRole("link", { name: /Publix/ })).toBeTruthy();
});

test("mobile category search shares the header controls and recognizes related terms", () => {
  render(<RetailerCategoryNav {...props} />);
  const input = screen.getByRole("searchbox", { name: "Search retailer categories or names" });
  const form = input.closest("form")!;
  expect(form.className).toContain("bg-white");
  expect(form.getAttribute("action")).toBe("/browse");
  expect(screen.getByRole("button", { name: "Search catalog" })).toBeTruthy();
  expect(form.querySelector("svg")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Go to search results" })).toBeNull();

  fireEvent.change(input, { target: { value: "spark plugs" } });
  const nav = within(screen.getByRole("navigation", { name: "Retailer categories" }));
  expect(nav.getByRole("button", { name: "Automotive" })).toBeTruthy();
  expect(nav.queryByRole("button", { name: "Groceries" })).toBeNull();
  expect(screen.getByRole("button", { name: "Go to search results" })).toBeTruthy();
});

test("a clicked category stays open while the pointer crosses another category", () => {
  render(<RetailerCategoryNav {...props} />);
  const nav = within(screen.getByRole("navigation", { name: "Retailer categories" }));
  const automotive = nav.getByRole("button", { name: "Automotive" });
  const groceries = nav.getByRole("button", { name: "Groceries" });
  fireEvent.click(automotive);
  fireEvent.pointerEnter(groceries, { pointerType: "mouse" });
  expect(automotive.getAttribute("aria-expanded")).toBe("true");
  expect(groceries.getAttribute("aria-expanded")).toBe("false");
  expect(screen.getByRole("heading", { name: "Automotive" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close retailer list" }));
  expect(document.getElementById("retailer-category-panel")).toBeNull();
});

test("All retailers clears the selected brand and category", () => {
  render(<RetailerCategoryNav {...props} />);
  const all = new URL(screen.getByRole("link", { name: "All retailers" }).getAttribute("href") ?? "", "https://example.test");
  expect(all.searchParams.get("partnerCategory")).toBeNull();
  expect(all.searchParams.get("retailer")).toBeNull();
  expect(all.searchParams.get("q")).toBe("card");
});
