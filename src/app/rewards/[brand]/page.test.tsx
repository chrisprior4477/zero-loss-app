import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { popularRewardAmounts, popularRewardBrands, popularRewardProductSlug } from "@/lib/catalog/popular-rewards";
import RewardBrandPage from "./page";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));

afterEach(cleanup);

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
