import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BrowseFilters, FilterForm } from "./BrowseFilters";
import { giftCardPartnerGroups } from "@/lib/catalog/gift-card-partners";
import { retailerFilterGroups } from "@/lib/catalog/browse-filters";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(cleanup);

test("clearing filters keeps the applied query when the edited draft is invalid", () => {
  const onNavigate = vi.fn();
  render(<FilterForm id="invalid-clear-query"
    filters={{ type: "all", retailer: "", availableOnly: false, sort: "featured", minValue: null, maxValue: 100 }}
    retailerGroups={[]} selectedRetailerGroup={null} selectedCategory={null} searchTerm="Sony" subcategory=""
    clearHref="/browse?q=Sony" onNavigate={onNavigate} />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "!!!" } });
  fireEvent.click(screen.getByRole("link", { name: "Clear filters" }));
  expect(onNavigate).toHaveBeenCalledWith("/browse?q=Sony#search-results");
  expect(screen.getByRole("searchbox")).toHaveProperty("value", "Sony");
});

test("Apply filters honors an explicit clear of the search term", () => {
  render(<FilterForm id="clear-query"
    filters={{ type: "all", retailer: "", availableOnly: true, sort: "fewest-left", minValue: null, maxValue: 100 }}
    retailerGroups={[]} selectedRetailerGroup={null} selectedCategory="ending-soon" ticketsLeft="2-5"
    searchTerm="Walmart" subcategory="" clearHref="/browse?category=ending-soon"
  />);
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  const url = new URL(push.mock.lastCall![0], "https://example.test");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    category: "ending-soon", ticketsLeft: "2-5", available: "1", sort: "fewest-left", maxValue: "100",
  });
});

test("reapplying the current filters keeps a single results fragment", () => {
  push.mockClear();
  window.history.replaceState(null, "", "/browse?q=Walmart#search-results#search-results");
  try {
    render(<FilterForm id="same-filters" filters={{ type: "all", retailer: "", availableOnly: false, sort: "featured", minValue: null, maxValue: null }}
      retailerGroups={[]} selectedRetailerGroup={null} selectedCategory={null} searchTerm="Walmart" subcategory="" clearHref="/browse?q=Walmart" />);
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(window.location.hash).toBe("#search-results");
    expect(push).not.toHaveBeenCalled();
  } finally { window.history.replaceState(null, "", "/"); }
});

test("sorting keeps an open custom range until Apply filters", () => {
  const onNavigate = vi.fn();
  render(<FilterForm id="custom-range" onNavigate={onNavigate}
    filters={{ type: "all", retailer: "", availableOnly: false, sort: "featured", minValue: null, maxValue: null }}
    retailerGroups={[]} selectedRetailerGroup={null} selectedCategory="electronics" searchTerm="" subcategory="" clearHref="/browse?category=electronics"
  />);
  fireEvent.click(screen.getByRole("radio", { name: "Custom range" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "From ($)" }), { target: { value: "300" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "To ($)" }), { target: { value: "600" } });
  fireEvent.click(screen.getByRole("radio", { name: "Highest prize value" }));
  expect(onNavigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(onNavigate).toHaveBeenCalledOnce();
});

test("a filter category suggestion uses the currently edited query", () => {
  render(<BrowseFilters
    filters={{ type: "all", retailer: "", availableOnly: false, sort: "featured", minValue: null, maxValue: null }}
    retailerGroups={[{ id: "automotive", category: "Automotive", options: [{ label: "AutoZone®", value: "AutoZone®", hasOffer: false }] }]}
    selectedRetailerGroup={null} selectedCategory={null} searchTerm="paper towels" subcategory="" clearHref="/browse"
  />);
  const search = screen.getAllByRole("searchbox", { name: "Search all prizes" })[0];
  const searchField = search.parentElement!;
  expect(searchField.className).toContain("bg-white");
  expect(within(searchField).getByRole("button", { name: "Search catalog" })).toBeTruthy();
  expect(searchField.querySelector("svg")).toBeTruthy();
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: "spark plugs" } });
  expect(within(searchField).getByRole("button", { name: "Go to search results" }).textContent).toBe("Go");
  const results = within(screen.getByRole("region", { name: "Matching retailer categories" }));
  expect(results.getByRole("link", { name: /Automotive/ }).getAttribute("href"))
    .toBe("/browse?partnerCategory=automotive&q=spark+plugs#search-results");
});

test("Filter and sort suggestions retain Ending Soon and the selected price range", () => {
  const onNavigate = vi.fn();
  render(<FilterForm id="regression" onNavigate={onNavigate}
    filters={{ type: "gift-cards", retailer: "Best Buy", availableOnly: true, sort: "fewest-left", minValue: 5, maxValue: 25 }}
    retailerGroups={retailerFilterGroups(giftCardPartnerGroups, [])}
    selectedRetailerGroup={null} selectedCategory="ending-soon" searchTerm="" subcategory="" clearHref="/browse"
  />);
  const search = screen.getByRole("searchbox", { name: "Search Best Buy in Ending Soon" });
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: "beauty" } });
  const suggestion = screen.getByRole("link", { name: /Pharmacy/ });
  const url = new URL(suggestion.getAttribute("href")!, "https://example.test");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    category: "ending-soon", partnerCategory: "pharmacy", type: "gift-cards", available: "1", q: "beauty",
    minValue: "5", maxValue: "25", sort: "fewest-left",
  });
  expect(url.hash).toBe("#search-results");
  fireEvent.click(suggestion, { ctrlKey: true });
  expect(onNavigate).not.toHaveBeenCalled();
  fireEvent.click(suggestion);
  expect(onNavigate).toHaveBeenCalledOnce();
});
