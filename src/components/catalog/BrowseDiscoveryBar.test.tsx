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
