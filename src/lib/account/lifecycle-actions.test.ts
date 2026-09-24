import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { purchaseGiftCard } from "./lifecycle-actions";
const optionId = "11111111-1111-4111-8111-111111111111";
const rewardId = "22222222-2222-4222-8222-222222222222";
function form() {
  const data = new FormData(); data.set("completionOptionId", optionId); return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  mocks.rpc.mockResolvedValue({ data: { status: "purchased", rewardId } });
});
test("server derives identity and uses the same option-bound key, ignoring client prices and destinations", async () => {
  const data = form(); data.set("amount", "1"); data.set("customerId", "someone-else"); data.set("href", "https://evil.test");
  for (let attempt = 0; attempt < 2; attempt++) {
    expect(await purchaseGiftCard({ status: "idle" }, data)).toMatchObject({ status: "succeeded", href: `/account/wallet?rewardId=${rewardId}` });
  }
  expect(mocks.getUser).toHaveBeenCalledTimes(2);
  expect(mocks.rpc.mock.calls).toEqual(Array.from({ length: 2 }, () => ["purchase_preview_gift_card", { p_option_id: optionId, p_idempotency_key: "checkout_11111111111141118111111111111111" }]));
});
test("invalid or signed-out requests cannot make a purchase", async () => {
  const data = form(); data.set("completionOptionId", "not-an-id");
  expect((await purchaseGiftCard({ status: "idle" }, data)).status).toBe("error");
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await purchaseGiftCard({ status: "idle" }, form())).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("insufficient balance gets an actionable, known-no-purchase response", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "P0001", message: "Add demo funds before completing this option." } });
  expect(await purchaseGiftCard({ status: "idle" }, form())).toMatchObject({ status: "error", recovery: "balance" });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
test.each([
  { error: { code: "504", message: "private infrastructure details" } },
  { data: null }, { data: { status: "queued" } },
  { error: { code: "P0001", message: "Option expired" } },
])("unconfirmed results require an authoritative check and never leak internals: %j", async result => {
  mocks.rpc.mockResolvedValue(result);
  const state = await purchaseGiftCard({ status: "idle" }, form());
  expect(state).toMatchObject({ status: "error", recovery: "check" });
  expect(JSON.stringify(state)).not.toContain("private infrastructure details");
});
test("timeout after commit cannot claim the purchase failed or automatically retry it", async () => {
  mocks.rpc.mockRejectedValue(new Error("lost response after commit"));
  expect(await purchaseGiftCard({ status: "idle" }, form())).toMatchObject({ status: "error", recovery: "check", message: expect.stringContaining("may already be complete") });
  expect(mocks.rpc).toHaveBeenCalledOnce();
});
test("an older duplicate receipt resolves the same exact reward by option, not by product", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { status: "purchased", duplicate: true, orderNumber: "ZL-SAVED" } })
    .mockResolvedValueOnce({ data: [{ completion_option_id: "other", reward_id: "33333333-3333-4333-8333-333333333333" }, { completion_option_id: optionId, reward_id: rewardId }] });
  expect(await purchaseGiftCard({ status: "idle" }, form())).toMatchObject({ status: "succeeded", href: `/account/wallet?rewardId=${rewardId}` });
});
test("confirmed purchase with an unavailable receipt lookup goes to Orders, not another charge", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { status: "purchased", duplicate: true } }).mockRejectedValueOnce(new Error("read unavailable"));
  expect(await purchaseGiftCard({ status: "idle" }, form())).toMatchObject({ status: "succeeded", href: "/account/orders" });
});
