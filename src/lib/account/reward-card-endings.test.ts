import { expect, test, vi } from "vitest";
import { rewardCardEndings } from "./reward-card-endings";
import type { AccountActivity, ActivityItem } from "./activity";

const card = (id: string, extra: Partial<ActivityItem> = {}): ActivityItem => ({
  slug: "best-buy", title: "$100 Best Buy Gift Card", retailer: "Best Buy", image: "/test.png",
  status: "prize", rewardKind: "digital", priceCents: 10000, paidCents: 100,
  remainingCents: 0, availability: "Ready", rewardId: id, rewardStatus: "ready",
  rewardClaimedAt: "2026-11-10T12:00:00Z", ...extra,
});
const state = (activity: ActivityItem[]): AccountActivity => ({ activity, isPreview: false, activeCount: 0, source: "stored" });

test("returns actual card suffixes, never the reward reference or full credentials", async () => {
  const read = vi.fn().mockResolvedValueOnce({ code: "1234 5678 9012" }).mockResolvedValueOnce({ code: "4321-8765-2109" });
  expect(await rewardCardEndings(state([card("ref-8406"), card("ref-1111")]), read)).toEqual({ "ref-8406": "9012", "ref-1111": "2109" });
});

test("does not read unique, unclaimed, or expired cards", async () => {
  const read = vi.fn();
  await rewardCardEndings(state([card("unique", { slug: "walmart" }), card("unclaimed", { rewardClaimedAt: null }), card("expired", { rewardStatus: "expired" })]), read);
  expect(read).not.toHaveBeenCalled();
});

test("a failed credential read does not hide the saved rewards", async () => {
  const read = vi.fn().mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(null);
  expect(await rewardCardEndings(state([card("one"), card("two")]), read)).toEqual({});
});
