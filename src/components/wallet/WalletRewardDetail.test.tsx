import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PRODUCT_SHARE_EVENT } from "@/lib/sharing/product-share";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ActivityItem, RewardStatus } from "@/lib/account/activity";
import type { RewardClaimActionState } from "@/lib/account/lifecycle-actions";
import { WalletRewardDetail } from "./WalletRewards";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(), share: vi.fn(), refresh: vi.fn(), beginVerification: vi.fn(), skipVerification: vi.fn(),
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", async importOriginal => ({
  ...await importOriginal<typeof import("next/navigation")>(), useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/lib/account/lifecycle-actions", () => ({ claimReward: mocks.claim }));
vi.mock("@/lib/crew/actions", () => ({ shareWinWithCrew: mocks.share }));
vi.mock("@/lib/identity/demo-verification-actions", () => ({
  beginDemoVerification: mocks.beginVerification, skipDemoVerificationForPresentation: mocks.skipVerification,
}));
vi.mock("./DemoRewardRestartControl", () => ({ DemoRewardRestartControl: () => <button>Remove sample reward &amp; restart demo</button> }));
beforeEach(() => {
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(cleanup);

const item: ActivityItem = {
  slug: "samsung-m70h-tv", title: "Test prize", retailer: "Test retailer", image: "/test.png",
  status: "prize", rewardKind: "digital", priceCents: 5000, paidCents: 100, remainingCents: 0,
  availability: "Reward ready", rewardId: "11111111-1111-4111-8111-111111111111",
  rewardStatus: "ready", rewardClaimedAt: "2026-09-21T12:00:00Z",
};

const nextRewardId = "22222222-2222-4222-8222-222222222222";
const unclaimed = { ...item, rewardClaimedAt: null };

test.each(["succeeded", "verification_required"] as const)("a late claim result (%s) stays with the original reward", async status => {
  let finish!: (result: RewardClaimActionState) => void;
  mocks.claim.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<WalletRewardDetail item={unclaimed} isPreview />);
  fireEvent.submit(screen.getByRole("button", { name: "Claim reward" }).closest("form")!);
  expect(await screen.findByRole("button", { name: "Claiming…" })).toHaveProperty("disabled", true);

  view.rerender(<WalletRewardDetail item={{ ...unclaimed, rewardId: nextRewardId }} isPreview />);
  expect(screen.getByRole("button", { name: "Claim reward" })).toHaveProperty("disabled", false);
  await act(async () => finish({ status, message: "Response for the first reward" }));
  expect(screen.getByRole("button", { name: "Claim reward" })).toHaveProperty("disabled", false);
  expect(screen.queryByText("Response for the first reward")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.claim).toHaveBeenCalledOnce();
  expect(mocks.claim.mock.calls[0][1].get("rewardId")).toBe(item.rewardId);

  mocks.claim.mockResolvedValueOnce({ status: "succeeded", message: "Second reward claimed" });
  fireEvent.submit(screen.getByRole("button", { name: "Claim reward" }).closest("form")!);
  expect(await screen.findByText("Second reward claimed")).toBeTruthy();
  expect(mocks.claim.mock.calls[1][1].get("rewardId")).toBe(nextRewardId);
});

test("leaving a reward during the identity shortcut stops the follow-up actions", async () => {
  let finish!: (result: { verification: { id: string; step: string } }) => void;
  mocks.claim.mockResolvedValueOnce({ status: "verification_required", message: "Verify this reward" });
  mocks.beginVerification.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<WalletRewardDetail item={unclaimed} isPreview />);
  fireEvent.submit(screen.getByRole("button", { name: "Claim reward" }).closest("form")!);
  fireEvent.click(await screen.findByRole("button", { name: "Skip check & claim demo reward" }));
  expect(mocks.beginVerification).toHaveBeenCalledWith(item.rewardId);

  view.rerender(<WalletRewardDetail item={{ ...unclaimed, rewardId: nextRewardId }} isPreview />);
  await act(async () => finish({ verification: { id: "first-check", step: "start" } }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.skipVerification).not.toHaveBeenCalled();
  expect(mocks.claim).toHaveBeenCalledOnce();
});

test("Crew selections and share feedback stay with the exact reward, even for the same prize", async () => {
  let finish!: (result: { ok: boolean; message: string }) => void;
  mocks.share.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const members = [{ id: "crew-a", name: "Ari" }, { id: "crew-b", name: "Sam" }];
  const reward = (rewardId: string) => <WalletRewardDetail item={{ ...item, rewardId }} isPreview claimedCode="123456789012" crewMembers={members} />;
  const view = render(reward(item.rewardId!));
  fireEvent.click(screen.getByRole("checkbox", { name: "Ari" }));
  fireEvent.click(screen.getByRole("button", { name: "Share win with selected Crew" }));
  expect(mocks.share).toHaveBeenCalledWith(item.rewardId, ["crew-a"]);

  view.rerender(reward(nextRewardId));
  await act(async () => finish({ ok: true, message: "First share saved" }));
  expect(screen.getByRole("checkbox", { name: "Ari" })).toHaveProperty("checked", false);
  expect(screen.queryByText("First share saved")).toBeNull();
  expect(mocks.share).toHaveBeenCalledOnce();

  mocks.share.mockResolvedValueOnce({ ok: true, message: "Second share saved" });
  fireEvent.click(screen.getByRole("checkbox", { name: "Sam" }));
  fireEvent.click(screen.getByRole("button", { name: "Share win with selected Crew" }));
  expect(await screen.findByText("Second share saved")).toBeTruthy();
  expect(mocks.share).toHaveBeenLastCalledWith(nextRewardId, ["crew-b"]);
  view.rerender(reward(nextRewardId));
  expect(screen.getByRole("button", { name: "Share saved" })).toHaveProperty("disabled", true);
});

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
  expect(screen.getByText("Claimed on")).toBeTruthy();
  expect(screen.queryByText("Claim by")).toBeNull();
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
  expect(screen.getByRole("link", { name: "Get reward help" }).getAttribute("href")).toBe(`/support?rewardId=${item.rewardId}#report-problem`);
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
  expect(screen.getByText("Claim by")).toBeTruthy();
  expect(screen.getByLabelText("Sample reward barcode")).toBeTruthy();
  expect(screen.getByText("Demo preview · Not claimed")).toBeTruthy();
  expect(screen.getByText("Illustrative number only · Not redeemable")).toBeTruthy();
  expect(screen.getByText("Claim your reward to open your saved gift-card number.")).toBeTruthy();
  expect(screen.queryByText("Copy or show the code")).toBeNull();
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

test("a used card says Already used and never offers its former code", () => {
  render(<WalletRewardDetail item={{ ...item, rewardStatus: "redeemed" }} isPreview claimedCode="123456789012" />);
  expect(screen.getAllByText("Already used").length).toBeGreaterThan(0);
  expect(screen.getByRole("status").textContent).toContain("already been used");
  expect(screen.queryByText("1234 5678 9012")).toBeNull();
  expect((screen.getByRole("button", { name: /Copy number/ }) as HTMLButtonElement).disabled).toBe(true);
});

test("the intentional illustrative sample remains available when there is no stored reward", () => {
  render(<WalletRewardDetail item={{ ...item, rewardId: null, rewardStatus: null, rewardClaimedAt: null }} isPreview />);
  expect(screen.getByLabelText("Sample reward barcode")).toBeTruthy();
  expect(screen.getByText("Sample — not redeemable")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Remove sample reward & restart demo" })).toBeNull();
});
