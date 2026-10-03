import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BrowseFilters } from "./BrowseFilters";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);

test("Browse search offers a direct category link while typing", () => {
  render(<BrowseFilters
    filters={{ type: "all", retailer: "", availableOnly: false, sort: "featured", minValue: null, maxValue: null }}
    retailerGroups={[{ id: "automotive", category: "Automotive", options: [{ label: "AutoZone®", value: "AutoZone®", hasOffer: false }] }]}
    selectedRetailerGroup={null} selectedCategory={null} searchTerm="" subcategory="" clearHref="/browse"
  />);
  const search = screen.getAllByRole("searchbox", { name: "Search products & categories" })[0];
  const searchField = search.parentElement!;
  expect(searchField.className).toContain("bg-white");
  expect(within(searchField).getByRole("button", { name: "Search catalog" })).toBeTruthy();
  expect(searchField.querySelector("svg")).toBeTruthy();
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: "spark plugs" } });
  expect(within(searchField).getByRole("button", { name: "Go to search results" }).textContent).toBe("Go");
  const results = within(screen.getByRole("region", { name: "Matching retailer categories" }));
  expect(results.getByRole("link", { name: /Automotive/ }).getAttribute("href"))
    .toBe("/browse?partnerCategory=automotive");
});
