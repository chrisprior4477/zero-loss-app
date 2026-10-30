import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import FreeEntryPage from "./page";
import PrintFreeEntryPage from "./print/page";

vi.mock("@/lib/account/context", () => ({ getAccountContext: vi.fn(async () => null) }));
afterEach(cleanup);

test.each([
  "/browse?category=electronics&sort=fewest-left",
  "/browse?q=coffee&available=1&minValue=25",
])("free-entry and print return to the same shopping context: %s", async (browse) => {
  const { unmount } = render(await FreeEntryPage({ searchParams: Promise.resolve({ offering: "airpods-pro", from: browse }) }));
  const product = new URL(screen.getByRole("link", { name: /Back to Apple AirPods/ }).getAttribute("href")!, "https://example.test");
  expect(product.pathname).toBe("/items/airpods-pro");
  expect(product.searchParams.get("from")).toBe(browse);
  unmount();
  render(await PrintFreeEntryPage({ searchParams: Promise.resolve({ offering: "airpods-pro", from: browse }) }));
  const instructions = new URL(screen.getByRole("link", { name: /Back to entry instructions/ }).getAttribute("href")!, "https://example.test");
  expect(instructions.searchParams.get("from")).toBe(browse);
});

test("free-entry rejects unsafe return destinations", async () => {
  render(await FreeEntryPage({ searchParams: Promise.resolve({ offering: "airpods-pro", from: "https://evil.test/browse" }) }));
  expect(screen.getByRole("link", { name: /Back to Apple AirPods/ }).getAttribute("href")).toBe("/items/airpods-pro");
});
