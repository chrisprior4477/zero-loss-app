import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, test, vi } from "vitest";
import { getStoredAccountActivity } from "./activity-reader";

const row = { entry_id: "entry", slug: "test", title: "Test card", retailer: "Test", image: "/test.png",
  status: "active", reward_kind: "digital", availability: "Open", price_cents: "2500", paid_cents: 100, remaining_cents: 2400 };
const client = (...data: unknown[]) => ({ rpc: vi.fn().mockResolvedValue({ data, error: null }) }) as unknown as SupabaseClient;

test("keeps good activity without publishing a complete count or assuming missing amounts are zero", async () => {
  const result = await getStoredAccountActivity(client(row, { ...row, status: "retired" }, { ...row, paid_cents: null }));
  expect(result).toMatchObject({ activeCount: null, incomplete: true, activity: [{ paidCents: 100, priceCents: 2500 }] });
  await expect(getStoredAccountActivity(client({ ...row, remaining_cents: "" }))).rejects.toThrow("Invalid activity record");
});

test("an unreadable claim date remains unverified", async () => {
  const result = await getStoredAccountActivity(client({ ...row, status: "prize", reward_id: "reward", reward_status: "ready", reward_claimed_at: "invalid" }));
  expect(result).toMatchObject({ incomplete: true, activity: [{ rewardId: "reward", rewardStatus: null, rewardClaimedAt: null }] });
});
