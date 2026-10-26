import { afterEach, beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), orders: vi.fn(), activity: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/account/orders", () => ({ getAccountOrders: mocks.orders }));
vi.mock("@/lib/account/activity-reader", () => ({ getStoredAccountActivity: mocks.activity }));
import { saveSupportCase } from "./actions";
const caseId = "11111111-1111-4111-8111-111111111111";
const transactionId = "22222222-2222-4222-8222-222222222222";
function form() {
  const data = new FormData();
  Object.entries({ requestKey: "support_request_001", subject: "Funding question", category: "wallet", body: "Please check this transaction.", transactionId }).forEach(([key, value]) => data.set(key, value));
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  vi.stubEnv("VERCEL_ENV", "preview");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  mocks.rpc.mockResolvedValue({ data: caseId });
});
afterEach(() => vi.unstubAllEnvs());
test("creates an authenticated, transaction-linked case with a replay key", async () => {
  const data = form(); data.set("customerId", "another-account"); data.set("staff", "true");
  expect(await saveSupportCase({ status: "idle" }, data)).toEqual({ status: "saved", caseId });
  expect(mocks.getUser).toHaveBeenCalled();
  expect(mocks.rpc).toHaveBeenCalledWith("create_support_case", { p_ledger_entry_id: transactionId, p_category: "wallet", p_subject: "Funding question", p_body: "Please check this transaction.", p_idempotency_key: "support_request_001" });
  expect(mocks.revalidate.mock.calls).toEqual([["/support"], ["/contact"], ["/account/notifications"]]);
});
test("reply status authority stays in Supabase, never trusts a client role", async () => {
  const data = form(); data.set("caseId", caseId); data.set("status", "resolved");
  mocks.rpc.mockResolvedValue({ error: { code: "42501" } });
  expect(await saveSupportCase({ status: "idle" }, data)).toMatchObject({ status: "error", message: expect.stringContaining("unavailable") });
  expect(mocks.rpc).toHaveBeenCalledWith("reply_support_case", { p_case_id: caseId, p_body: "Please check this transaction.", p_status: "resolved", p_idempotency_key: "support_request_001" });
});
test.each([["body", "short"], ["subject", "bad"], ["transactionId", "foreign-url"], ["caseId", "invalid"], ["requestKey", "small"], ["category", "refund-money"], ["status", "approved"]])("rejects invalid %s before a database write", async (key, value) => {
  const data = form(); data.set(key, value);
  expect((await saveSupportCase({ status: "idle" }, data)).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("signed-out requests and production fail closed", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await saveSupportCase({ status: "idle" }, form())).status).toBe("error");
  vi.stubEnv("VERCEL_ENV", "production");
  expect((await saveSupportCase({ status: "idle" }, form())).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test.each(["P0001", "42501", "22023"])("database rejection %s is not falsely reported as saved", async code => {
  mocks.rpc.mockResolvedValue({ error: { code } });
  expect(await saveSupportCase({ status: "idle" }, form())).toMatchObject({ status: "error" });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
test("an ambiguous transport failure preserves an exact-retry state", async () => {
  mocks.rpc.mockRejectedValue(new Error("Timeout after commit"));
  expect(await saveSupportCase({ status: "idle" }, form())).toMatchObject({ status: "error", uncertain: true });
});
test("malformed success cannot redirect to an arbitrary URL", async () => {
  mocks.rpc.mockResolvedValue({ data: "https://attacker.example" });
  expect(await saveSupportCase({ status: "idle" }, form())).toMatchObject({ status: "error", uncertain: true });
});

const rewardId = "33333333-3333-4333-8333-333333333333";
function orderForm() { const data = form(); data.delete("transactionId"); data.set("rewardId", rewardId); data.set("orderNumber", "spoofed"); return data; }
test("support resolves an owned order on the server instead of accepting a posted reference", async () => {
  mocks.orders.mockResolvedValue({ source: "stored", orders: [{ rewardId, orderNumber: "ord_verified", rewardSlug: "gift-card", title: "Gift card", retailer: "Shop", image: "/gift.png", faceValueCents: 10000, amountPaidCents: 9900, status: "fulfilled", createdAt: "2026-10-26" }] });
  mocks.activity.mockResolvedValue({ source: "customer-empty", activity: [] });
  expect(await saveSupportCase({ status: "idle" }, orderForm())).toEqual({ status: "saved", caseId });
  const args = mocks.rpc.mock.calls[0][1];
  expect(args.p_body).toContain("ord_verified");
  expect(args.p_body).toContain(rewardId);
  expect(args.p_body).not.toContain("spoofed");
  expect(args.p_ledger_entry_id).toBeNull();
});
test("foreign or unavailable orders never create a support case", async () => {
  mocks.orders.mockResolvedValue({ source: "stored", orders: [] });
  mocks.activity.mockResolvedValue({ source: "customer-empty", activity: [] });
  expect(await saveSupportCase({ status: "idle" }, orderForm())).toMatchObject({ status: "error", message: expect.stringContaining("unavailable for this account") });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
