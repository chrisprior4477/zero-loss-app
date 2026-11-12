import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BrowseFilters, FilterForm } from "./BrowseFilters";
import { giftCardPartnerGroups } from "@/lib/catalog/gift-card-partners";
import { retailerFilterGroups } from "@/lib/catalog/browse-filters";

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
    .toBe("/browse?partnerCategory=automotive#search-results");
});

test("Filter and sort suggestions retain Ending Soon and the selected price range", () => {
  const onNavigate = vi.fn();
  render(<FilterForm id="regression" onNavigate={onNavigate}
    filters={{ type: "gift-cards", retailer: "Best Buy", availableOnly: true, sort: "fewest-left", minValue: 5, maxValue: 25 }}
    retailerGroups={retailerFilterGroups(giftCardPartnerGroups, [])}
    selectedRetailerGroup={null} selectedCategory="ending-soon" searchTerm="" subcategory="" clearHref="/browse"
  />);
  const search = screen.getByRole("searchbox", { name: "Search products & categories" });
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: "beauty" } });
  const suggestion = screen.getByRole("link", { name: /Pharmacy/ });
  const url = new URL(suggestion.getAttribute("href")!, "https://example.test");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    category: "ending-soon", partnerCategory: "pharmacy", type: "gift-cards", available: "1",
    minValue: "5", maxValue: "25", sort: "fewest-left",
  });
  expect(url.hash).toBe("#search-results");
  fireEvent.click(suggestion, { ctrlKey: true });
  expect(onNavigate).not.toHaveBeenCalled();
  fireEvent.click(suggestion);
  expect(onNavigate).toHaveBeenCalledOnce();
});
