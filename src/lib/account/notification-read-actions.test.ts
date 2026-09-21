import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), upsert: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { markNotificationsRead } from "./notification-read-actions";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "signed-in-owner" } }, error: null });
  mocks.from.mockReturnValue({ upsert: mocks.upsert });
  mocks.upsert.mockResolvedValue({ error: null });
});
test("read receipts use authenticated ownership and replay-safe storage", async () => {
  expect((await markNotificationsRead(["reward-one", "reward-one", "wallet-one"])).ok).toBe(true);
  expect(mocks.from).toHaveBeenCalledWith("customer_notification_reads");
  expect(mocks.upsert).toHaveBeenCalledWith([
    { customer_id: "signed-in-owner", notification_id: "reward-one" },
    { customer_id: "signed-in-owner", notification_id: "wallet-one" },
  ], { onConflict: "customer_id,notification_id", ignoreDuplicates: true });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/notifications");
});
test("an expired session never writes a read receipt", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await markNotificationsRead(["reward-one"])).ok).toBe(false);
  expect(mocks.upsert).not.toHaveBeenCalled();
});
test.each([[], [""], ["x".repeat(161)], Array(1001).fill("reward")])("rejects invalid receipt batches", async ids => {
  expect((await markNotificationsRead(ids)).ok).toBe(false);
  expect(mocks.getUser).not.toHaveBeenCalled();
  expect(mocks.from).not.toHaveBeenCalled();
});
test("storage failure is not reported as saved", async () => {
  mocks.upsert.mockResolvedValue({ error: { message: "offline" } });
  expect((await markNotificationsRead(["reward-one"])).ok).toBe(false);
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
