import { expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountOrders } from "./orders";

const row = { order_number: "order-1", reward_slug: "same-prize", reward_id: "reward-1",
  title: "Test prize", retailer: "Test retailer", image: "/test.png", status: "fulfilled",
  face_value_cents: 2500, amount_paid_cents: 2400, created_at: "2026-09-21T12:00:00Z" };
const client = (data: unknown) => ({ rpc: vi.fn().mockResolvedValue({ data, error: null }) }) as unknown as SupabaseClient;

test("the order reader retains exact reward identities for duplicate products", async () => {
  const result = await getAccountOrders(client([row, { ...row, order_number: "order-2", reward_id: "reward-2" }]));
  expect(result.orders.map(order => order.rewardId)).toEqual(["reward-1", "reward-2"]);
});
test.each([undefined, null, "", "   ", 123])("a missing or invalid reward ID cannot become an ambiguous product link: %s", async id => {
  await expect(getAccountOrders(client([{ ...row, reward_id: id }]))).rejects.toThrow("Invalid order");
});
