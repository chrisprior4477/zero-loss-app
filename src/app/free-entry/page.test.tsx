import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FreeEntryPage from "./page";
import PrintFreeEntryPage from "./print/page";

vi.mock("@/lib/account/context", () => ({ getAccountContext: vi.fn(async () => null) }));
afterEach(cleanup);

test.each([
  "/browse?category=electronics&sort=fewest-left",
  "/browse?q=coffee&available=1&minValue=25",
  "/rewards/nintendo",
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

test("seven unsubmitted entries survive the instructions and print-preview round trip", async () => {
  const query = { offering: "airpods-pro", from: "/browse?category=electronics", quantity: "7" };
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  try {
    const { unmount } = render(await FreeEntryPage({ searchParams: Promise.resolve(query) }));
    const back = new URL(screen.getByRole("link", { name: /Back to Apple AirPods/ }).getAttribute("href")!, "https://example.test");
    expect(back.pathname).toBe("/items/airpods-pro");
    expect(back.hash).toBe("#enter-entry");
    expect(back.searchParams.get("quantity")).toBe("7");
    expect(back.searchParams.get("from")).toBe(query.from);
    fireEvent.click(screen.getByRole("button", { name: "Print entry insert" }));
    const print = new URL(String(open.mock.calls[0][0]), "https://example.test");
    expect(print.pathname).toBe("/free-entry/print");
    unmount();
    render(await PrintFreeEntryPage({ searchParams: Promise.resolve(Object.fromEntries(print.searchParams)) }));
    const instructions = new URL(screen.getByRole("link", { name: /Back to entry instructions/ }).getAttribute("href")!, "https://example.test");
    expect(Object.fromEntries(instructions.searchParams)).toEqual(query);
  } finally {
    open.mockRestore();
  }
});

test.each(["0", "-1", "7.5", "2147483648", ["2", "7"]].map(quantity => ({ quantity })))("invalid quantity $quantity cannot become a return selection", async ({ quantity }) => {
  render(await FreeEntryPage({ searchParams: Promise.resolve({ offering: "airpods-pro", quantity }) }));
  expect(screen.getByRole("link", { name: /Back to Apple AirPods/ }).getAttribute("href")).toBe("/items/airpods-pro");
});
