import { afterEach, beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
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
