import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), upsert: vi.fn(), from: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { markNotificationsRead } from "./notification-read-actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null });
  mocks.from.mockReturnValue({ upsert: mocks.upsert });
  mocks.upsert.mockResolvedValue({ error: null });
});

test("persists unique read receipts for the authenticated account", async () => {
  expect(await markNotificationsRead(["crew-request-one", "crew-request-one", "wallet-ledger-one"])).toEqual({ ok: true, message: "Notification status saved." });
  expect(mocks.from).toHaveBeenCalledWith("customer_notification_reads");
  expect(mocks.upsert).toHaveBeenCalledWith([
    { customer_id: "11111111-1111-4111-8111-111111111111", notification_id: "crew-request-one" },
    { customer_id: "11111111-1111-4111-8111-111111111111", notification_id: "wallet-ledger-one" },
  ], { onConflict: "customer_id,notification_id", ignoreDuplicates: true });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/notifications");
});

test("rejects malformed receipt batches before accessing the database", async () => {
  expect((await markNotificationsRead([])).ok).toBe(false);
  expect((await markNotificationsRead(["x".repeat(161)])).ok).toBe(false);
  expect(mocks.getUser).not.toHaveBeenCalled();
});

test("does not save read receipts for a signed-out visitor", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await markNotificationsRead(["account-email-confirmed"])).ok).toBe(false);
  expect(mocks.upsert).not.toHaveBeenCalled();
});

test("does not claim success when the database write fails", async () => {
  mocks.upsert.mockResolvedValue({ error: { message: "Unavailable" } });
  expect((await markNotificationsRead(["account-email-confirmed"])).ok).toBe(false);
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
