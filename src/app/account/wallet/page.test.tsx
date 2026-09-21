import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getAccountContext: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.getAccountContext }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import WalletPage from "./page";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("an expired session keeps the funding destination and catalog prize through login", async () => {
  mocks.getAccountContext.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(WalletPage({ searchParams: Promise.resolve({ view: "history", from: "samsung-m70h-tv" }) })).rejects.toThrow("NEXT_REDIRECT");
  const destination = new URL(mocks.redirect.mock.calls[0][0], "https://example.test");
  expect(destination.pathname).toBe("/login");
  expect(destination.searchParams.get("next")).toBe("/account/wallet?view=history&from=samsung-m70h-tv#add-funds");
  expect(destination.searchParams.get("focus")).toBe("email");
  expect(destination.hash).toBe("#login-form");
});

test.each(["samsung-m70h-tv", "not-in-the-catalog", "https://evil.test", ["samsung-m70h-tv", "other"]])("only a known catalog prize produces a return link: %s", async (from) => {
  mocks.getAccountContext.mockResolvedValue({
    activity: { source: "customer-empty", isPreview: false, activity: [], activeCount: 0 },
    wallet: null, fundingEnabled: false,
  });
  render(await WalletPage({ searchParams: Promise.resolve({ view: "history", from }) }));
  const link = screen.queryByRole("link", { name: "Back to this prize" });
  if (from === "samsung-m70h-tv") {
    expect(link?.getAttribute("href")).toBe("/items/samsung-m70h-tv#enter-entry");
  } else {
    expect(link).toBeNull();
  }
});
