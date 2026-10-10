import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { OfferingAvailabilityProvider } from "./OfferingAvailabilityProvider";
import { DesktopMarketplaceRails } from "./DesktopMarketplaceRails";

vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("@/components/ui/FavoriteButton", () => ({ FavoriteButton: () => null }));
vi.mock("./RecentWinnerRoll", () => ({ RecentWinnerRoll: () => null }));
vi.mock("./SocialActivityFeed", () => ({ SocialActivityFeed: () => null }));

afterEach(cleanup);

test("all homepage product rails hide resolved demo prizes but preserve open prizes", () => {
  const resolvedSlugs = ["samsung-m70h-tv", "nike-court-shot-shoes", "babys-essentials-bundle"];
  render(<OfferingAvailabilityProvider snapshot={null} resolvedSlugs={resolvedSlugs}><DesktopMarketplaceRails /></OfferingAvailabilityProvider>);
  const ending = document.getElementById("ending-soon")!;
  expect(within(ending).queryByRole("link", { name: /Samsung 50.*M70H/i })).toBeNull();
  expect(within(ending).queryByRole("link", { name: /Nike.*Court Shot/i })).toBeNull();
  expect(within(ending).queryByRole("link", { name: /Baby's Essentials Bundle/i })).toBeNull();
  expect(within(ending).getByRole("link", { name: /Best Buy Gift Card/i })).toBeTruthy();
  for (const section of [screen.getByTestId("dollar-choice-carousel"), screen.getByRole("region", { name: "Browse the marketplace" }), screen.getByRole("region", { name: "Your Next Everyday Upgrade" })]) {
    expect(section.querySelector('a[href*="/items/samsung-m70h-tv"]')).toBeNull();
    expect(section.querySelector('a[href*="/items/nike-court-shot-shoes"]')).toBeNull();
    expect(section.querySelector('a[href*="/items/babys-essentials-bundle"]')).toBeNull();
    expect(section.querySelector('a[href*="/items/publix-100-gift-card"]')).toBeTruthy();
  }
});

test("empty outcome state restores the repeatable prizes to Ending Soon", () => {
  render(<OfferingAvailabilityProvider snapshot={null} resolvedSlugs={[]}><DesktopMarketplaceRails /></OfferingAvailabilityProvider>);
  const ending = document.getElementById("ending-soon")!;
  expect(ending.querySelector('a[href*="/items/samsung-m70h-tv"]')).toBeTruthy();
  expect(ending.querySelector('a[href*="/items/nike-court-shot-shoes"]')).toBeTruthy();
  expect(ending.querySelector('a[href*="/items/babys-essentials-bundle"]')).toBeTruthy();
});
