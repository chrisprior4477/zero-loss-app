import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { ActivityItem } from "@/lib/account/activity";
import { WalletRewards } from "./WalletRewards";

vi.mock("next/image", () => ({ default: () => <img alt="" src="/test.png" /> }));
vi.mock("./WalletLandingScroll", () => ({ WalletLandingScroll: () => null }));
vi.mock("./WalletRewardLink", () => ({ WalletRewardLink: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
vi.mock("./RewardHistoryCarousel", () => ({ RewardHistoryCarousel: () => null }));
vi.mock("@/lib/account/lifecycle-actions", () => ({}));
vi.mock("@/lib/crew/actions", () => ({}));
vi.mock("@/lib/identity/demo-verification-actions", () => ({}));
afterEach(cleanup);

test("duplicate cards retain reference and wallet message alongside their own ending and date", () => {
  const item: ActivityItem = { slug: "best-buy", title: "$100 Best Buy Gift Card", retailer: "Best Buy", image: "/test.png", status: "prize", rewardKind: "digital", priceCents: 10000, paidCents: 100, remainingCents: 0, availability: "Ready", rewardStatus: "ready", rewardClaimedAt: "2026-11-10T12:00:00Z" };
  const first = "11111111-1111-4111-8111-11113c918406";
  const second = "22222222-2222-4222-8222-222222222222";
  render(<WalletRewards state={{ isPreview: true, activeCount: 0, source: "stored", activity: [{ ...item, rewardId: first }, { ...item, rewardId: second }] }} cardEndings={{ [first]: "9012", [second]: "3456" }} />);
  expect(screen.getByText("3C918406")).toBeTruthy();
  expect(screen.getAllByText("Saved in your wallet")).toHaveLength(2);
  expect(screen.getByText("9012").closest("a")?.href).toContain(first);
  expect(screen.getByText("3456").closest("a")?.href).toContain(second);
  expect(screen.getAllByText("Nov 10, 2026")).toHaveLength(2);
});
