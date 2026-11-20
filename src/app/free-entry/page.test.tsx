import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FreeEntryPage from "./page";
import PrintFreeEntryPage from "./print/page";
import { getAccountContext } from "@/lib/account/context";

vi.mock("@/lib/account/context", () => ({ getAccountContext: vi.fn(async () => null) }));
afterEach(cleanup);

test("general free-entry instructions wait for the reader to choose a prize", async () => {
  render(await FreeEntryPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("link", { name: /Browse prizes/ }).getAttribute("href")).toBe("/browse#search-results");
  expect(screen.queryByRole("button", { name: "Print entry insert" })).toBeNull();
});

test("an unrecognized prize never substitutes the free-entry form for another prize", async () => {
  render(await FreeEntryPage({ searchParams: Promise.resolve({ offering: "retired-prize" }) }));
  expect(screen.getByRole("heading", { name: "Free-entry instructions unavailable" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to Browse" }).getAttribute("href")).toBe("/browse");
  expect(screen.queryByRole("button", { name: "Print entry insert" })).toBeNull();
});

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
  expect(screen.getByRole("link", { name: /Back to Apple AirPods/ }).getAttribute("href")).toBe("/items/airpods-pro#entry-action");
});

test("an old authenticated print URL resumes the filled instructions with the same prize and quantity", async () => {
  vi.mocked(getAccountContext).mockResolvedValue({ userId: "demo-user", legalFirstName: "Luka", legalLastName: "Łowicki" } as Awaited<ReturnType<typeof getAccountContext>>);
  try {
    await expect(PrintFreeEntryPage({ searchParams: Promise.resolve({ offering: "airpods-pro", quantity: "3", from: "/browse?q=Apple" }) }))
      .rejects.toMatchObject({ digest: expect.stringContaining("/free-entry?offering=airpods-pro&quantity=3&from=%2Fbrowse%3Fq%3DApple#free-entry-intro") });
  } finally { vi.mocked(getAccountContext).mockResolvedValue(null); }
});

test("seven unsubmitted entries survive the instructions and print-preview round trip", async () => {
  const query = { offering: "airpods-pro", from: "/browse?category=electronics", quantity: "7", share: "22222222-2222-4222-8222-222222222222" };
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  try {
    render(await FreeEntryPage({ searchParams: Promise.resolve(query) }));
    const back = new URL(screen.getByRole("link", { name: /Back to Apple AirPods/ }).getAttribute("href")!, "https://example.test");
    expect(back.pathname).toBe("/items/airpods-pro");
    expect(back.hash).toBe("#entry-action");
    expect(back.searchParams.get("quantity")).toBe("7");
    expect(back.searchParams.get("share")).toBe(query.share);
    expect(back.searchParams.get("from")).toBe(query.from);
    fireEvent.click(screen.getByRole("button", { name: "Print entry insert" }));
    expect(screen.getByRole("region", { name: "Letter-size print preview" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Back to entry instructions/ }));
    expect(screen.getByRole("link", { name: /Back to Apple AirPods/ }).getAttribute("href")).toBe(back.pathname + back.search + back.hash);
  } finally {
    scroll.mockRestore();
  }
});

test.each(["0", "-1", "7.5", "2147483648", ["2", "7"]].map(quantity => ({ quantity })))("invalid quantity $quantity cannot become a return selection", async ({ quantity }) => {
  render(await FreeEntryPage({ searchParams: Promise.resolve({ offering: "airpods-pro", quantity }) }));
  expect(screen.getByRole("link", { name: /Back to Apple AirPods/ }).getAttribute("href")).toBe("/items/airpods-pro#entry-action");
});
