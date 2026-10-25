import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PRODUCT_SHARE_EVENT } from "@/lib/sharing/product-share";
import { afterEach, expect, test, vi } from "vitest";
import type { ActivityItem, RewardStatus } from "@/lib/account/activity";
import { WalletRewardDetail } from "./WalletRewards";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("./RewardClaimControl", () => ({ RewardClaimControl: () => <button>Claim reward</button> }));
vi.mock("@/components/identity/DemoVerificationDialog", () => ({ DemoIdentityPreviewButton: () => <button>Preview identity check</button> }));
vi.mock("./DemoRewardRestartControl", () => ({ DemoRewardRestartControl: () => <button>Remove sample reward &amp; restart demo</button> }));
afterEach(cleanup);

const item: ActivityItem = {
  slug: "samsung-m70h-tv", title: "Test prize", retailer: "Test retailer", image: "/test.png",
  status: "prize", rewardKind: "digital", priceCents: 5000, paidCents: 100, remainingCents: 0,
  availability: "Reward ready", rewardId: "11111111-1111-4111-8111-111111111111",
  rewardStatus: "ready", rewardClaimedAt: "2026-09-21T12:00:00Z",
};

test.each(["prize", "completed"] as const)("%s reward sharing is a manual compact button and never includes the gift-card number", status => {
  const share = vi.fn();
  window.addEventListener(PRODUCT_SHARE_EVENT, share);
  try {
    render(<WalletRewardDetail item={{ ...item, status }} isPreview claimedCode="123456789012" />);
    expect(share).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: status === "prize" ? "Share your win" : "Share" }));
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0][0].detail).toEqual({ slug: item.slug, title: item.title, image: item.image, retailer: item.retailer, value: 50, ...(status === "prize" ? { win: { rewardId: item.rewardId, demo: true } } : {}) });
    expect(screen.getAllByText(status === "prize" ? "Your prize is ready!" : "Your gift card is ready.").length).toBeGreaterThan(0);
  } finally { window.removeEventListener(PRODUCT_SHARE_EVENT, share); }
});

test("a valid claimed reward uses its saved number and keeps the demo disclosure", () => {
  render(<WalletRewardDetail item={item} isPreview claimedCode="123456789012" />);
  expect(screen.getByText("1234 5678 9012")).toBeTruthy();
  expect(screen.getByText("Sample — not redeemable")).toBeTruthy();
  expect((screen.getByRole("button", { name: /Copy number/ }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByText("Claimed — ready to use")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Preview identity check" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Remove sample reward & restart demo" })).toBeTruthy();
  expect(screen.getAllByRole("link", { name: "Continue shopping" }).map(link => link.getAttribute("href"))).toEqual(["/", "/"]);
  expect(screen.getByRole("link", { name: "View fulfillment status" }).getAttribute("href")).toBe(`/account/orders?rewardId=${item.rewardId}#fulfillment-records`);
});

test.each([null, "", "   "])("a missing saved credential never generates a replacement sample: %s", code => {
  render(<WalletRewardDetail item={item} isPreview claimedCode={code} />);
  expect(screen.queryByLabelText("Sample reward barcode")).toBeNull();
  expect(screen.queryByText("Claimed — ready to use")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("couldn’t load your saved");
  expect((screen.getByRole("button", { name: /Copy number/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("link", { name: "Get reward help" }).getAttribute("href")).toBe("/support");
});

test.each<RewardStatus>(["expired", "cancelled", "redeemed", "issuance_pending", "issuance_failed"])("%s never exposes a code or claim action, even with stale claimed data", status => {
  const { rerender } = render(<WalletRewardDetail item={{ ...item, rewardStatus: status }} isPreview claimedCode="123456789012" />);
  for (const claimed of [true, false]) {
    rerender(<WalletRewardDetail item={{ ...item, rewardStatus: status, rewardClaimedAt: claimed ? item.rewardClaimedAt : null }} isPreview claimedCode="123456789012" />);
    expect(screen.queryByLabelText("Sample reward barcode")).toBeNull();
    expect(screen.queryByText("1234 5678 9012")).toBeNull();
    expect(screen.queryByText("Claimed — ready to use")).toBeNull();
    expect(screen.queryByRole("button", { name: "Claim reward" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Show barcode/ })).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  }
});

test("a ready unclaimed demo reward shows an illustrative barcode above the unchanged claim step", () => {
  render(<WalletRewardDetail item={{ ...item, rewardClaimedAt: null }} isPreview />);
  expect(screen.getByRole("button", { name: "Claim reward" })).toBeTruthy();
  expect(screen.getByLabelText("Sample reward barcode")).toBeTruthy();
  expect(screen.getByText("Demo preview · Not claimed")).toBeTruthy();
  expect(screen.getByText("Illustrative number only · Not redeemable")).toBeTruthy();
  expect(screen.getAllByText("Ready to claim")).toHaveLength(2);
  expect(screen.queryByText("Claimed — ready to use")).toBeNull();
  expect(screen.queryByRole("button", { name: /Copy number/ })).toBeNull();
});

test("an unclaimed non-preview reward still withholds its barcode", () => {
  render(<WalletRewardDetail item={{ ...item, rewardClaimedAt: null }} isPreview={false} />);
  expect(screen.getByRole("button", { name: "Claim reward" })).toBeTruthy();
  expect(screen.queryByLabelText("Sample reward barcode")).toBeNull();
});

test("does not offer a restart for a nonrepeatable reward", () => {
  render(<WalletRewardDetail item={{ ...item, slug: "walmart-100-gift-card" }} isPreview claimedCode="123456789012" />);
  expect(screen.queryByRole("button", { name: "Remove sample reward & restart demo" })).toBeNull();
});

test("an unknown stored status fails closed", () => {
  render(<WalletRewardDetail item={{ ...item, rewardStatus: null }} isPreview claimedCode="123456789012" />);
  expect(screen.queryByLabelText("Sample reward barcode")).toBeNull();
  expect(screen.queryByRole("button", { name: "Claim reward" })).toBeNull();
  expect(screen.getByRole("status")).toBeTruthy();
});

test("the intentional illustrative sample remains available when there is no stored reward", () => {
  render(<WalletRewardDetail item={{ ...item, rewardId: null, rewardStatus: null, rewardClaimedAt: null }} isPreview />);
  expect(screen.getByLabelText("Sample reward barcode")).toBeTruthy();
  expect(screen.getByText("Sample — not redeemable")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Remove sample reward & restart demo" })).toBeNull();
});
