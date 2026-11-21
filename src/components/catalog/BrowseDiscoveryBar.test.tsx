import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { BrowseDiscoveryBar, BrowseDiscoveryFooterControls } from "./BrowseDiscoveryBar";
import type { BrowseFilterProps } from "./BrowseFilters";
import { SearchResultsAutoScroll } from "./SearchResultsAutoScroll";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const props: BrowseFilterProps & { browseHref: string } = {
  browseHref: "/browse?partnerCategory=gas", searchTerm: "", subcategory: "", clearHref: "/browse", selectedCategory: null,
  filters: { type: "all", retailer: "", availableOnly: false, sort: "featured", minValue: null, maxValue: null },
  selectedRetailerGroup: { id: "gas", category: "Gas", options: [] },
  retailerGroups: [{ id: "automotive", category: "Automotive", options: [{ label: "AutoZone", value: "AutoZone", hasOffer: true }] }],
};
beforeEach(() => {
  navigation.push.mockReset();
  navigation.replace.mockReset();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const searchForm = () => screen.getByRole("search", { name: "Search marketplace" });

test("Categories voice search can clear its draft or submit a product search with the current filters", () => {
  let speak: ((text: string) => void) | undefined;
  vi.stubGlobal("SpeechRecognition", class {
    onresult: ((event: unknown) => void) | null = null;
    constructor() { speak = text => this.onresult?.({ results: [[{ transcript: text }]] }); }
    start() {}
    stop() {}
  });
  render(<BrowseDiscoveryBar {...props} selectedRetailerGroup={null} selectedCategory="everyday-items"
    browseHref="/browse?category=everyday-items&maxValue=25&batch=3" />);
  fireEvent.click(screen.getByRole("button", { name: "Categories" }));
  const picker = within(screen.getByRole("dialog"));
  const field = picker.getByRole("searchbox");
  fireEvent.click(picker.getByRole("button", { name: "Start voice search" }));
  act(() => speak?.("Sony"));
  expect(field).toHaveProperty("value", "Sony");
  fireEvent.click(picker.getByRole("button", { name: "Clear search" }));
  expect(field).toHaveProperty("value", "");
  expect(navigation.replace).not.toHaveBeenCalled();
  fireEvent.change(field, { target: { value: "Sony" } });
  fireEvent.click(picker.getByRole("button", { name: "Go to search results" }));
  expect(navigation.replace).toHaveBeenCalledWith("/browse?maxValue=25&q=Sony#search-results", { scroll: false });
});

test("the wide picker expands one category and refines its own results with the current search", () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  render(<BrowseDiscoveryBar {...props} selectedRetailerGroup={null} searchTerm="Sony"
    browseHref="/browse?category=electronics&maxValue=25&q=Sony" filters={{ ...props.filters, maxValue: 25 }}
    previews={{ "everyday-items": [{ slug: "sample-sony", title: "Sony Starter Kit", image: "/catalog/sample.png", remaining: 12 }] }} />);
  fireEvent.click(screen.getByRole("button", { name: "Categories" }));
  const picker = within(screen.getByRole("dialog"));
  expect(picker.getAllByRole("button", { expanded: false })).toHaveLength(20);
  fireEvent.click(picker.getByRole("button", { name: "Everyday Items" }));
  const preview = within(picker.getByRole("region", { name: "Everyday Items product preview" }));
  const opening = preview.getByRole("link", { name: /Sony Starter Kit/ }).getAttribute("href");
  expect(new URL(opening!, "https://example.test").searchParams.get("from"))
    .toBe("/browse?category=electronics&maxValue=25&q=Sony#category-preview~top~everyday-items~sample-sony");
  expect(preview.getByRole("link", { name: /See all Everyday Items/ }).getAttribute("href"))
    .toBe("/browse?category=everyday-items&maxValue=25&q=Sony#search-results");
  expect(navigation.replace).not.toHaveBeenCalled();
  fireEvent.click(preview.getByRole("button", { name: "Refine search" }));
  const filter = within(screen.getByRole("dialog", { name: "Filter & sort" }));
  expect(filter.getByRole("searchbox", { name: "Search Everyday Items" })).toHaveProperty("value", "Sony");
  fireEvent.click(filter.getByLabelText("$75 & below"));
  expect(navigation.replace).toHaveBeenCalledWith("/browse?maxValue=75&category=everyday-items&q=Sony#search-results", { scroll: false });
});

test("typing on Browse before opening filters carries the same search into the filter dialog", () => {
  render(<BrowseDiscoveryBar {...props} />);
  fireEvent.change(within(searchForm()).getByRole("searchbox"), { target: { value: "Sony" } });
  fireEvent.click(screen.getByRole("button", { name: /Filter & sort/ }));
  const filter = within(screen.getByRole("dialog"));
  expect(filter.getByRole("searchbox")).toHaveProperty("value", "Sony");
  fireEvent.change(filter.getByRole("searchbox"), { target: { value: "PlayStation" } });
  fireEvent.click(filter.getByRole("radio", { name: "Highest prize value" }));
  expect(navigation.replace).toHaveBeenCalledWith("/browse?q=PlayStation&partnerCategory=gas&sort=value-high#search-results", { scroll: false });
});

test("Escape restores the applied marketplace query without navigating", () => {
  render(<BrowseDiscoveryBar {...props} searchTerm="Walmart" />);
  const input = within(searchForm()).getByRole("searchbox");
  fireEvent.change(input, { target: { value: "Target" } });
  expect(fireEvent.keyDown(input, { key: "Escape" })).toBe(false);
  expect(input).toHaveProperty("value", "Walmart");
  expect(navigation.push).not.toHaveBeenCalled();
});

test.each(["Filter & sort", "Gas"])("only the Browse control that opened %s is expanded", name => {
  render(<BrowseDiscoveryBar {...props}><BrowseDiscoveryFooterControls /></BrowseDiscoveryBar>);
  const top = within(screen.getByRole("group", { name: "Browse options at the top" })).getByRole("button", { name });
  const bottom = within(screen.getByRole("group", { name: "Browse options at the bottom" })).getByRole("button", { name });
  fireEvent.click(bottom);
  expect(top.getAttribute("aria-expanded")).toBe("false");
  expect(bottom.getAttribute("aria-expanded")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Close browse options" }));
  expect(bottom.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(bottom);
});

test("the category picker keeps the search and drops the previous retailer when switching to Beauty", () => {
  render(<BrowseDiscoveryBar {...props} searchTerm="PlayStation" filters={{ ...props.filters, retailer: "AutoZone" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Gas" }));
  const picker = within(screen.getByRole("dialog"));
  fireEvent.change(picker.getByRole("searchbox"), { target: { value: "Beauty" } });
  fireEvent.click(picker.getByRole("button", { name: /Beauty.*Browse prizes/ }));
  expect(navigation.replace).toHaveBeenCalledWith("/browse?category=beauty&q=PlayStation#search-results", { scroll: false });
});

test("All categories exits the selected collection while keeping the selected budget", () => {
  render(<BrowseDiscoveryBar {...props} selectedCategory="beauty" selectedRetailerGroup={null} searchTerm="makeup"
    filters={{ ...props.filters, maxValue: 50 }} />);
  fireEvent.click(screen.getByRole("button", { name: "Categories" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /All categories/ }));
  expect(navigation.replace).toHaveBeenCalledWith("/browse?maxValue=50&q=makeup#search-results", { scroll: false });
});

test("View all removes only the selected retailer and stale batch", () => {
  render(<BrowseDiscoveryBar {...props} selectedCategory="electronics"
    selectedRetailerGroup={{ id: "digital-and-gaming", category: "Digital & Gaming", options: [] }}
    browseHref="/browse?category=electronics&partnerCategory=digital-and-gaming&retailer=Best+Buy&maxValue=100&batch=2"
    filters={{ ...props.filters, retailer: "Best Buy", maxValue: 100 }} />);
  expect(screen.getByRole("link", { name: "View all in this category" }).getAttribute("href"))
    .toBe("/browse?category=electronics&partnerCategory=digital-and-gaming&maxValue=100#search-results");
});

test("category and retailer views preserve separate searches", () => {
  render(<BrowseDiscoveryBar {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Gas" }));
  const picker = within(screen.getByRole("dialog"));
  const input = picker.getByRole("searchbox") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Electronics" } });
  fireEvent.click(picker.getByRole("button", { name: "Retailers" }));
  expect(input.value).toBe("");
  fireEvent.change(input, { target: { value: "AutoZone" } });
  expect(picker.getByRole("button", { name: /AutoZone.*View current offers/ })).toBeTruthy();
  fireEvent.click(picker.getByRole("button", { name: "Categories" }));
  expect(input.value).toBe("Electronics");
  fireEvent.click(picker.getByRole("button", { name: "Retailers" }));
  expect(input.value).toBe("AutoZone");
});

test("removing the retailer category preserves the prize category, query and other filters", () => {
  render(<BrowseDiscoveryBar {...props} selectedCategory="electronics" searchTerm="sony"
    selectedRetailerGroup={{ id: "digital-and-gaming", category: "Digital & Gaming", options: [] }}
    browseHref="/browse?category=electronics&q=sony&partnerCategory=digital-and-gaming&maxValue=100&batch=2"
    filters={{ ...props.filters, maxValue: 100 }} />);
  expect(screen.getByRole("searchbox", { name: "Search Digital & Gaming in Electronics" })).toBeTruthy();
  expect(screen.getByText("Results for “sony” · Digital & Gaming in Electronics")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Remove Digital & Gaming" }).getAttribute("href"))
    .toBe("/browse?category=electronics&q=sony&maxValue=100#search-results");
});

test.each(["value-high", "fewest-left", "price-low"] as const)("changing departments keeps the selected %s sorting and budget", sort => {
  render(<BrowseDiscoveryBar {...props} selectedCategory="beauty" selectedRetailerGroup={null}
    filters={{ ...props.filters, sort, maxValue: 100 }} />);
  fireEvent.click(screen.getByRole("button", { name: "Categories" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Health.*Browse prizes/ }));
  expect(navigation.replace).toHaveBeenCalledWith(`/browse?category=health&maxValue=100&sort=${sort}#search-results`, { scroll: false });
});

test("choosing Ending Soon retains its usual near-capacity ordering", () => {
  render(<BrowseDiscoveryBar {...props} selectedRetailerGroup={null} filters={{ ...props.filters, sort: "value-high" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Categories" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Ending Soon.*Browse prizes/ }));
  expect(navigation.replace).toHaveBeenCalledWith("/browse?sort=ending-soon#search-results", { scroll: false });
});

function openPriceFilters() {
  render(<BrowseDiscoveryBar {...props} selectedRetailerGroup={null} />);
  fireEvent.click(screen.getByRole("button", { name: /Filter & sort/ }));
  return within(screen.getByRole("dialog", { name: "Filter & sort" }));
}

test("keyboard price selection waits for Apply filters", () => {
  const form = openPriceFilters();
  const first = form.getByRole("radio", { name: "$25 & below" });
  fireEvent.keyDown(first, { key: "ArrowRight" });
  fireEvent.click(form.getByRole("radio", { name: "$50 & below" }));
  expect(navigation.push).not.toHaveBeenCalled();
  fireEvent.click(form.getByRole("button", { name: "Apply filters" }));
  expect(navigation.replace).toHaveBeenCalledWith("/browse?maxValue=50#search-results", { scroll: false });
});

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
  expect(navigation.replace).toHaveBeenCalledWith("/browse?minValue=25&maxValue=50#search-results", { scroll: false });
});

test("fractional drafts cannot apply or prevent switching to a preset", () => {
  const form = openPriceFilters();
  const from = form.getByRole("spinbutton", { name: "From ($)" });
  fireEvent.focus(from);
  fireEvent.change(from, { target: { value: "0.02" } });
  fireEvent.click(form.getByRole("button", { name: "Apply filters" }));
  expect(navigation.push).not.toHaveBeenCalled();
  fireEvent.click(form.getByLabelText("$75 & below"));
  expect(navigation.replace).toHaveBeenCalledWith("/browse?maxValue=75#search-results", { scroll: false });
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
  fireEvent.click(within(screen.getByRole("listbox", { name: "Minimum prize value" })).getByRole("option", { name: "$0" }));
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  fireEvent.click(form.getByRole("button", { name: "Apply filters" }));
  expect(navigation.replace).toHaveBeenCalledWith("/browse?minValue=0#search-results", { scroll: false });
});

test("Go searches within a retailer category and the X clears a draft without submitting", () => {
  render(<BrowseDiscoveryBar {...props} />);
  const form = searchForm();
  fireEvent.change(within(form).getByRole("searchbox"), { target: { value: "atuo" } });
  expect(within(form).getByRole("button", { name: "Go to search results" }).textContent).toBe("Go");
  fireEvent.click(within(form).getByRole("button", { name: "Go to search results" }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?partnerCategory=gas&q=atuo#search-results", { scroll: false });
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
])("a new Browse search keeps its category, filters, and value range $minValue–$maxValue", range => {
  render(<BrowseDiscoveryBar {...props} selectedCategory="groceries" selectedRetailerGroup={null}
    browseHref={`/browse?category=groceries&type=gift-cards&available=1&sort=fewest-left&retailer=Publix&batch=2${range.minValue === null ? "" : `&minValue=${range.minValue}`}${range.maxValue === null ? "" : `&maxValue=${range.maxValue}`}`}
    filters={{ ...props.filters, ...range, type: "gift-cards", availableOnly: true, sort: "fewest-left", retailer: "Publix" }} />);
  fireEvent.change(within(searchForm()).getByRole("searchbox", { name: "Search Publix in Groceries" }), { target: { value: "Publix" } });
  fireEvent.submit(searchForm());
  const url = new URL(navigation.push.mock.calls.at(-1)![0], "https://example.test");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    category: "groceries", type: "gift-cards", available: "1", sort: "fewest-left", retailer: "Publix", q: "Publix",
    ...(range.minValue === null ? {} : { minValue: String(range.minValue) }),
    ...(range.maxValue === null ? {} : { maxValue: String(range.maxValue) }),
  });
  expect(url.hash).toBe("#search-results");
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

test("submitting a cleared Browse search keeps the category and focuses the replacement field", () => {
  const previous = window.location.href;
  const destination = "/browse?category=electronics&sort=price-low#search-results";
  try {
    window.history.replaceState(null, "", "/browse?category=electronics&sort=price-low&q=Sony");
    const view = render(<BrowseDiscoveryBar {...props} selectedCategory="electronics" searchTerm="Sony"
      browseHref="/browse?category=electronics&sort=price-low&q=Sony" />);
    fireEvent.change(within(searchForm()).getByRole("searchbox"), { target: { value: "" } });
    fireEvent.submit(searchForm());
    expect(navigation.push).toHaveBeenCalledWith(destination, { scroll: false });
    view.unmount();
    window.history.replaceState(null, "", destination);
    render(<><section id="search-results"><BrowseDiscoveryBar {...props} selectedCategory="electronics" browseHref={destination} /></section>
      <SearchResultsAutoScroll searchKey="" mobileBrowseKey={destination} /></>);
    expect(document.activeElement).toBe(within(searchForm()).getByRole("searchbox"));
  } finally {
    window.history.replaceState(null, "", previous);
  }
});

test("voice search can replace an existing query and remains available after a transcript", () => {
  let recognition: { onresult: ((event: unknown) => void) | null };
  const stop = vi.fn();
  vi.stubGlobal("SpeechRecognition", class {
    onresult: ((event: unknown) => void) | null = null; start() {} stop() { stop(); }
    constructor() { recognition = { onresult: event => this.onresult?.(event) }; }
  });
  render(<BrowseDiscoveryBar {...props} searchTerm="old query" />);
  fireEvent.click(within(searchForm()).getByRole("button", { name: "Start voice search" }));
  act(() => recognition.onresult?.({ results: [[{ transcript: "baby products" }]] }));
  expect(within(searchForm()).getByDisplayValue("baby products")).toBeTruthy();
  expect(within(searchForm()).getByRole("button", { name: "Start voice search" })).toBeTruthy();
  expect(stop).toHaveBeenCalledOnce();
  fireEvent.click(within(searchForm()).getByRole("button", { name: "Go to search results" }));
  expect(navigation.push).toHaveBeenCalledWith("/browse?partnerCategory=gas&q=baby+products#search-results", { scroll: false });
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
  expect(navigation.replace).toHaveBeenCalledWith("/browse?partnerCategory=automotive#search-results", { scroll: false });
});


test("Clear filters discards an unapplied range even when the destination URL is unchanged", () => {
  const form = openPriceFilters();
  fireEvent.change(form.getByRole("spinbutton", { name: "From ($)" }), { target: { value: "50" } });
  fireEvent.change(form.getByRole("spinbutton", { name: "To ($)" }), { target: { value: "100" } });
  fireEvent.click(form.getByRole("link", { name: "Clear filters" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Filter & sort/ }));
  const reopened = within(screen.getByRole("dialog"));
  expect((reopened.getByRole("spinbutton", { name: "From ($)" }) as HTMLInputElement).value).toBe("");
  expect((reopened.getByRole("spinbutton", { name: "To ($)" }) as HTMLInputElement).value).toBe("");
});

test.each(["close", "cancel", "backdrop", "choose", "unmount"])("the category picker locks the viewport and restores its prior overflow on %s", exit => {
  document.documentElement.style.overflow = "clip visible";
  document.body.style.overflow = "auto";
  const view = render(<BrowseDiscoveryBar {...props} />);
  const trigger = screen.getByRole("button", { name: "Gas" });
  fireEvent.click(trigger);
  expect(document.documentElement.style.overflow).toBe("hidden");
  expect(document.body.style.overflow).toBe("hidden");
  const dialog = screen.getByRole("dialog");
  if (exit === "close") fireEvent.click(screen.getByRole("button", { name: "Close browse options" }));
  if (exit === "cancel") fireEvent(dialog, new Event("cancel", { cancelable: true }));
  if (exit === "backdrop") fireEvent.click(dialog);
  if (exit === "choose") fireEvent.click(within(dialog).getByRole("button", { name: /All categories/ }));
  if (exit === "unmount") view.unmount();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.documentElement.style.overflow).toBe("clip visible");
  expect(document.body.style.overflow).toBe("auto");
  if (exit !== "unmount") expect(document.activeElement).toBe(trigger);
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
});

test("filter sorting keeps the page locked until its popup closes", () => {
  const form = openPriceFilters();
  expect(document.documentElement.style.overflow).toBe("hidden");
  fireEvent.click(form.getByRole("button", { name: "Close browse options" }));
  expect(document.documentElement.style.overflow).not.toBe("hidden");
});
