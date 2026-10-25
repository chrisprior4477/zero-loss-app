import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), reads: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc }) }));
vi.mock("@/lib/account/notification-read-store", () => ({ storeNotificationReads: mocks.reads }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { recordReceivedProduct, setReceivedProductState } from "./saved-share-actions";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ data: { user: { id: "server-user" } }, error: null }); mocks.rpc.mockResolvedValue({ data: id, error: null }); mocks.reads.mockResolvedValue({ ok: true }); });
test("email save uses the received-share RPC and returns the shared section", async () => {
  expect(await recordReceivedProduct("nike-court-shot-shoes", id, true)).toMatchObject({ ok: true, href: "/account/favorites?tab=shared" });
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("record_saved_product_share", { p_slug: "nike-court-shot-shoes", p_token: id, p_save: true });
});
test("older unattributed links save a received item without inventing a sender", async () => {
  await recordReceivedProduct("nike-court-shot-shoes", null, true);
  expect(mocks.rpc).toHaveBeenCalledWith("record_saved_product_share", { p_slug: "nike-court-shot-shoes", p_token: null, p_save: true });
});
test("invalid products, forged tokens and anonymous callers cannot write", async () => {
  expect((await recordReceivedProduct("missing-product", id, true)).ok).toBe(false);
  expect((await recordReceivedProduct("nike-court-shot-shoes", "forged", true)).ok).toBe(false);
  mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
  expect((await recordReceivedProduct("nike-court-shot-shoes", id, true)).ok).toBe(false);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("declining retains the receipt and marks its notification read only after success", async () => {
  mocks.rpc.mockResolvedValue({ data: { id, viewedAt: "2026-10-25", declinedAt: "2026-10-25" }, error: null });
  expect(await setReceivedProductState(id, "declined")).toMatchObject({ ok: true, declinedAt: "2026-10-25" });
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("set_saved_product_share_state", { p_id: id, p_state: "declined" });
  expect(mocks.reads).toHaveBeenCalledWith([`shared-${id}`]);
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } }); mocks.reads.mockClear();
  expect((await setReceivedProductState(id, "restore")).ok).toBe(false); expect(mocks.reads).not.toHaveBeenCalled();
});
test("a notification outage does not misreport an already committed decline", async () => {
  mocks.rpc.mockResolvedValue({ data: { id, viewedAt: "today", declinedAt: "today" }, error: null });
  mocks.reads.mockRejectedValue(new Error("Notification unavailable"));
  expect(await setReceivedProductState(id, "declined")).toMatchObject({ ok: true, declinedAt: "today" });
});
