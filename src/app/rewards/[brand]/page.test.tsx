import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { popularRewardAmounts, popularRewardBrands, popularRewardProductSlug } from "@/lib/catalog/popular-rewards";
import RewardBrandPage from "./page";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: async () => null }));
const availability = vi.hoisted(() => vi.fn(async (): Promise<unknown> => null));
vi.mock("@/lib/catalog/availability-reader", () => ({ getOfferingAvailability: availability }));

afterEach(() => { cleanup(); availability.mockResolvedValue(null); });

test("Best Buy keeps open denominations when its $100 pool closes", async () => {
  const brand = "best-buy";
  availability.mockResolvedValue(Object.fromEntries(popularRewardAmounts.map(amount => {
    const slug = popularRewardProductSlug(brand, amount);
    return [slug, { slug, capacity: 100, sold: amount, remaining: 100 - amount, entryPriceCents: 100 }];
  })));
  render(await RewardBrandPage({ params: Promise.resolve({ brand }) }));
  expect(screen.queryByRole("heading", { name: "$100 Best Buy Gift Card" })).toBeNull();
  expect(screen.getAllByText("Enter for $1")).toHaveLength(3);
});

test.each(popularRewardBrands)("$name cards offer a mobile-sized $1 entry action for every value", async (brand) => {
  render(await RewardBrandPage({ params: Promise.resolve({ brand: brand.slug }) }));

  const actions = screen.getAllByText("Enter for $1");
  expect(actions).toHaveLength(popularRewardAmounts.length);

  actions.forEach((action, index) => {
    expect(action.className).toContain("rounded-lg bg-[#31e800]");
    expect(action.className).toContain("whitespace-nowrap");
    expect(action.closest("a")?.getAttribute("href")).toBe(
      `/items/${popularRewardProductSlug(brand.slug, popularRewardAmounts[index])}?from=${encodeURIComponent(`/rewards/${brand.slug}`)}#enter-entry`,
    );
  });
});
