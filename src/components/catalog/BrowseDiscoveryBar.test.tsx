import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { BrowseDiscoveryBar } from "./BrowseDiscoveryBar";
import type { BrowseFilterProps } from "./BrowseFilters";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const props: BrowseFilterProps & { browseHref: string } = {
  browseHref: "/browse?partnerCategory=gas", searchTerm: "", subcategory: "", clearHref: "/browse", selectedCategory: null,
  filters: { type: "all", retailer: "", availableOnly: false, sort: "featured", minValue: null, maxValue: null },
  selectedRetailerGroup: { id: "gas", category: "Gas", options: [] },
  retailerGroups: [{ id: "automotive", category: "Automotive", options: [{ label: "AutoZone", value: "AutoZone", hasOffer: true }] }],
};
beforeEach(() => {
  navigation.push.mockReset();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const searchForm = () => screen.getByRole("search", { name: "Search marketplace" });

function openPriceFilters() {
  render(<BrowseDiscoveryBar {...props} selectedRetailerGroup={null} />);
  fireEvent.click(screen.getByRole("button", { name: /Filter & sort/ }));
  return within(screen.getByRole("dialog", { name: "Filter & sort" }));
}

test("correcting either custom bound validates the current pair and applies the inclusive range", () => {
  const form = openPriceFilters();
  const from = form.getByRole("spinbutton", { name: "From ($)" });
  const to = form.getByRole("spinbutton", { name: "To ($)" });
  const apply = form.getByRole("button", { name: "Apply filters" });
  fireEvent.focus(from);
  fireEvent.change(from, { target: { value: "100" } });
  fireEvent.change(to, { target: { value: "50" } });
  fireEvent.click(apply);
  expect(form.getByText("Maximum must be at least the minimum.")).toBeTruthy();
  expect(navigation.push).not.toHaveBeenCalled();
  fireEvent.change(to, { target: { value: "101" } });
  expect(form.queryByText("Maximum must be at least the minimum.")).toBeNull();
  fireEvent.change(to, { target: { value: "50" } });
  fireEvent.change(from, { target: { value: "25" } });
  expect(form.queryByText("Maximum must be at least the minimum.")).toBeNull();
  fireEvent.click(apply);
  expect(navigation.push).toHaveBeenCalledWith("/browse?minValue=25&maxValue=50#search-results", { scroll: false });
});

test("fractional drafts cannot apply or prevent switching to a preset", () => {
  const form = openPriceFilters();
  const from = form.getByRole("spinbutton", { name: "From ($)" });
  fireEvent.focus(from);
  fireEvent.change(from, { target: { value: "0.02" } });
  fireEvent.click(form.getByRole("button", { name: "Apply filters" }));
  expect(navigation.push).not.toHaveBeenCalled();
  fireEvent.click(form.getByLabelText("$75 & below"));
  expect(navigation.push).toHaveBeenCalledWith("/browse?maxValue=75#search-results", { scroll: false });
});

test("the dollar wheel saves zero, can clear a bound, and Cancel keeps the current selection", () => {
  const form = openPriceFilters();
  const from = () => form.getByRole("button", { name: /From \(\$\)/ });
  fireEvent.click(from());
  let list = screen.getByRole("listbox", { name: "Minimum prize value" });
  fireEvent.keyDown(list, { key: "End" });
  expect(within(list).getByRole("option", { selected: true }).textContent).toBe("$1,000,000");
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  fireEvent.click(from());
  list = screen.getByRole("listbox", { name: "Minimum prize value" });
  fireEvent.keyDown(list, { key: "Home" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(from().textContent).toContain("$1,000,000");
  fireEvent.click(from());
  fireEvent.click(screen.getByRole("button", { name: "Clear amount" }));
  expect(from().textContent).toContain("No minimum");
  fireEvent.click(from());
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  fireEvent.click(form.getByRole("button", { name: "Apply filters" }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?minValue=0#search-results", { scroll: false });
});

test("Go searches across departments and the X clears a draft without submitting", () => {
  render(<BrowseDiscoveryBar {...props} />);
  const form = searchForm();
  fireEvent.change(within(form).getByRole("searchbox"), { target: { value: "atuo" } });
  expect(within(form).getByRole("button", { name: "Go to search results" }).textContent).toBe("Go");
  fireEvent.click(within(form).getByRole("button", { name: "Go to search results" }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?q=atuo#search-results", { scroll: false });
  navigation.push.mockClear();
  fireEvent.click(within(form).getByRole("button", { name: "Clear search" }));
  expect((within(form).getByRole("searchbox") as HTMLInputElement).value).toBe("");
  expect(within(form).getByRole("button", { name: "Start voice search" })).toBeTruthy();
  expect(navigation.push).not.toHaveBeenCalled();
});

test.each([
  { minValue: null, maxValue: 25 },
  { minValue: null, maxValue: 50 },
  { minValue: null, maxValue: 75 },
  { minValue: null, maxValue: 100 },
  { minValue: 100, maxValue: null },
  { minValue: 25, maxValue: 75 },
])("a new catalog search leaves the previous value range $minValue–$maxValue and matches the global header", range => {
  render(<BrowseDiscoveryBar {...props} selectedCategory="groceries" selectedRetailerGroup={null}
    browseHref={`/browse?category=groceries&type=gift-cards&available=1&sort=fewest-left&retailer=Publix${range.minValue === null ? "" : `&minValue=${range.minValue}`}${range.maxValue === null ? "" : `&maxValue=${range.maxValue}`}`}
    filters={{ ...props.filters, ...range, type: "gift-cards", availableOnly: true, sort: "fewest-left", retailer: "Publix" }} />);
  fireEvent.change(within(searchForm()).getByRole("searchbox", { name: "Search all prizes" }), { target: { value: "PlayStation" } });
  fireEvent.submit(searchForm());
  expect(navigation.push).toHaveBeenCalledWith("/browse?q=PlayStation#search-results", { scroll: false });
});

test("the visible prize-value chip can remove only that range without losing the chosen category or query", () => {
  render(<BrowseDiscoveryBar {...props} selectedCategory="electronics" selectedRetailerGroup={null} searchTerm="PlayStation"
    browseHref="/browse?category=electronics&q=PlayStation&minValue=25&maxValue=75&sort=fewest-left"
    filters={{ ...props.filters, minValue: 25, maxValue: 75, sort: "fewest-left" }} />);
  expect(screen.getByText("$25–$75")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Remove prize value filter: $25–$75" }).getAttribute("href"))
    .toBe("/browse?category=electronics&q=PlayStation&sort=fewest-left#search-results");
});

test("clearing an applied query restores the unsearched list on the same page", () => {
  render(<BrowseDiscoveryBar {...props} searchTerm="auto" browseHref="/browse?q=auto&sort=price-low" />);
  fireEvent.click(within(searchForm()).getByRole("button", { name: "Clear search" }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?sort=price-low#search-results", { scroll: false });
});

test("voice transcript fills the field and changes the microphone to Go", () => {
  let recognition: { onresult: ((event: unknown) => void) | null };
  const stop = vi.fn();
  vi.stubGlobal("SpeechRecognition", class {
    onresult: ((event: unknown) => void) | null = null; start() {} stop() { stop(); }
    constructor() { recognition = { onresult: event => this.onresult?.(event) }; }
  });
  render(<BrowseDiscoveryBar {...props} />);
  fireEvent.click(within(searchForm()).getByRole("button", { name: "Start voice search" }));
  act(() => recognition.onresult?.({ results: [[{ transcript: "baby products" }]] }));
  expect(within(searchForm()).getByDisplayValue("baby products")).toBeTruthy();
  expect(stop).toHaveBeenCalledOnce();
  fireEvent.click(within(searchForm()).getByRole("button", { name: "Go to search results" }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?q=baby+products#search-results", { scroll: false });
});

test("an unsupported microphone explains how to continue instead of being decorative", () => {
  vi.stubGlobal("SpeechRecognition", undefined);
  vi.stubGlobal("webkitSpeechRecognition", undefined);
  render(<BrowseDiscoveryBar {...props} />);
  fireEvent.click(within(searchForm()).getByRole("button", { name: "Start voice search" }));
  expect(screen.getByRole("status").textContent).toContain("type your search");
});

test("a blocked microphone reports the permission problem", () => {
  let recognition: { onerror: ((event: unknown) => void) | null };
  vi.stubGlobal("SpeechRecognition", class { onerror: ((event: unknown) => void) | null = null; start() {} stop() {} constructor() { recognition = { onerror: event => this.onerror?.(event) }; } });
  render(<BrowseDiscoveryBar {...props} />);
  fireEvent.click(within(searchForm()).getByRole("button", { name: "Start voice search" }));
  act(() => recognition.onerror?.({ error: "not-allowed" }));
  expect(screen.getByRole("status").textContent).toContain("Allow microphone access");
});

test("the scrolling category picker accepts misspellings and keeps its destination", () => {
  render(<BrowseDiscoveryBar {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Gas" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "atuo" } });
  fireEvent.click(within(dialog).getByRole("button", { name: /Automotive/ }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?partnerCategory=automotive#search-results", { scroll: false });
});
