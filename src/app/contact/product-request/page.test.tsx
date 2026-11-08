import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
vi.mock("@/lib/account/context", () => ({ getAccountContext: vi.fn(async () => null) }));
import ProductRequestPage from "./page";

afterEach(cleanup);

test("prefills the requested product from an empty search", async () => {
  render(await ProductRequestPage({ searchParams: Promise.resolve({ product: "kayak" }) }));

  expect(screen.getByRole("heading", { name: "What would you love to see on Zero Loss?" })).toBeTruthy();
  expect((screen.getByLabelText("What would you like to see?") as HTMLInputElement).value).toBe("kayak");
  expect(screen.getByRole("button", { name: "Send product request →" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Back to search/ }).getAttribute("href")).toBe("/browse?q=kayak");
});

test.each([
  "https://example.test/browse?maxValue=25", "//example.test/browse", "/account/favorites",
  "/account/wallet", "/browse?next=https://example.test", ["/browse?maxValue=25", "/browse?maxValue=75"],
])("ignores an unrelated or ambiguous return destination: %j", async from => {
  render(await ProductRequestPage({ searchParams: Promise.resolve({ product: "kayak", from }) }));
  expect(screen.getByRole("link", { name: /Back to search/ }).getAttribute("href")).toBe("/browse?q=kayak");
});
