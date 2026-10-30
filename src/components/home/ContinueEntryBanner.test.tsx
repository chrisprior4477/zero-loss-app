import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { clearEntryIntent, readEntryIntent, saveEntryIntent } from "@/lib/entries/return-intent";
import { readViewedProduct, rememberViewedProduct } from "@/lib/catalog/viewed-product";
import { ContinueEntryBanner } from "./ContinueEntryBanner";
import { RememberViewedProduct } from "@/components/product/RememberViewedProduct";

const products = [
  { slug: "samsung-m70h-tv", title: "Samsung 50-inch TV", image: "/test-tv.png" },
  { slug: "playstation-5-slim", title: "PlayStation 5 Slim Model", image: "/dollar-choice-gaming.png" },
];
afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); });

test("offers a compact continuation on mobile and desktop without a saved entry record", () => {
  saveEntryIntent("samsung-m70h-tv", "Samsung 50-inch TV", 4, undefined, "funding");
  render(<ContinueEntryBanner products={products} />);
  expect(screen.getByText("Samsung 50-inch TV")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Continue your entry" }).getAttribute("href")).toBe("/items/samsung-m70h-tv?quantity=4#enter-entry");
  expect(screen.getByText("Not submitted")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss reminder" }));
  expect(screen.queryByRole("link", { name: "Continue your entry" })).toBeNull();
  expect(sessionStorage.getItem("zero-loss-entry-intent-v1")).toBeNull();
});

test("does not show the prompt without a recent explicit selection", () => {
  render(<ContinueEntryBanner products={products} />);
  expect(screen.queryByRole("link", { name: "Continue your entry" })).toBeNull();
});

test("quantity selection without funding or sign-in never triggers the reminder", () => {
  saveEntryIntent("samsung-m70h-tv", "Samsung TV", 4);
  render(<ContinueEntryBanner products={products} />);
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(readEntryIntent()?.quantity).toBe(4);
});

test("ordinary product browsing never shows a homepage reminder", () => {
  const page = render(<RememberViewedProduct slug="playstation-5-slim" browseReturn="/browse?category=electronics&sort=fewest-left" />);
  page.unmount();
  expect(readEntryIntent()).toBeNull();
  render(<ContinueEntryBanner products={products} />);
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(screen.queryByText("Not submitted")).toBeNull();
});

test("an unfinished entry takes priority and dismissal stays dismissed after remount", () => {
  saveEntryIntent("samsung-m70h-tv", "Untrusted stored title", 4, "/browse?category=electronics", "sign-in");
  rememberViewedProduct("playstation-5-slim");
  const banner = render(<ContinueEntryBanner products={products} />);
  expect(screen.getByText("Samsung 50-inch TV")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Continue your entry" }).getAttribute("href"))
    .toBe("/items/samsung-m70h-tv?quantity=4&from=%2Fbrowse%3Fcategory%3Delectronics#enter-entry");
  expect(screen.queryByRole("link", { name: "Back to this product" })).toBeNull();
  fireEvent.keyDown(screen.getByRole("button", { name: "Dismiss reminder" }), { key: "Escape" });
  banner.unmount();
  render(<ContinueEntryBanner products={products} />);
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(readEntryIntent()).toBeNull();
  expect(readViewedProduct()).toBeNull();
});

test("submitting an entry clears both reminders for that product, including a mounted Home", () => {
  rememberViewedProduct("samsung-m70h-tv");
  saveEntryIntent("samsung-m70h-tv", "Samsung TV", 1, undefined, "funding");
  render(<ContinueEntryBanner products={products} />);
  act(() => clearEntryIntent("samsung-m70h-tv"));
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(readViewedProduct()).toBeNull();
});

test("unknown, sold-out or resolved products omitted by the server do not get a reminder", () => {
  rememberViewedProduct("samsung-m70h-tv");
  saveEntryIntent("samsung-m70h-tv", "Samsung TV", 1);
  render(<ContinueEntryBanner products={[]} />);
  expect(screen.queryByRole("complementary")).toBeNull();
});

test("viewing hints expire and unavailable storage does not break the homepage", () => {
  rememberViewedProduct("playstation-5-slim");
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + 25 * 60 * 60 * 1000);
  expect(readViewedProduct()).toBeNull();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  render(<ContinueEntryBanner products={products} />);
  expect(screen.queryByRole("complementary")).toBeNull();
});
