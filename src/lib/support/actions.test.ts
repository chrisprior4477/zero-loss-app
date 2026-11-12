import { afterEach, beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), from: vi.fn(), reward: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc, from: mocks.from }) }));
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
  const rewardQuery={select:vi.fn(),eq:vi.fn(),maybeSingle:mocks.reward};
  rewardQuery.select.mockReturnValue(rewardQuery);rewardQuery.eq.mockReturnValue(rewardQuery);
  mocks.from.mockReturnValue(rewardQuery);mocks.reward.mockResolvedValue({data:{id:caseId},error:null});
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

test.each([
  ["subject", "     ", "subject", "subject of 5–140"],
  ["body", "          ", "body", "message of 10–4,000"],
])("identifies the invalid %s after trimming without touching the database", async (key, value, field, message) => {
  const data = form(); data.set(key, value);
  expect(await saveSupportCase({ status: "idle" }, data)).toMatchObject({ status: "error", field, message: expect.stringContaining(message) });
  expect(mocks.getUser).not.toHaveBeenCalled();
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

function rewardForm(){const data=form();data.delete('transactionId');data.set('rewardId',caseId);data.set('category','reward');return data;}
test('the opening case stores an owner-verified reward reference in its durable message without a wallet transaction',async()=>{
 const data=rewardForm();data.set('customerId','foreign-owner');data.set('giftCardCode','never-copy-this');
 expect(await saveSupportCase({status:'idle'},data)).toEqual({status:'saved',caseId});
 expect(mocks.from).toHaveBeenCalledWith('customer_rewards');
 expect(mocks.from.mock.results[0].value.eq.mock.calls).toEqual([['id',caseId],['customer_id','owner']]);
 const args=mocks.rpc.mock.calls[0][1];
 expect(args.p_ledger_entry_id).toBeNull();expect(args.p_category).toBe('reward');
 expect(args.p_body).toBe(`Reward reference: ${caseId}\n\nPlease check this transaction.`);
 expect(args.p_body).not.toContain('never-copy-this');
 await saveSupportCase({status:'error',uncertain:true,message:'Check result'},data);
 expect(mocks.rpc.mock.calls[1]).toEqual(mocks.rpc.mock.calls[0]);
});
test.each([null,{data:null,error:{message:'Unavailable'}}])('an unavailable or foreign reward cannot create a linked case (%s)',async failure=>{
 mocks.reward.mockResolvedValue({data:null,error:failure});
 expect(await saveSupportCase({status:'idle'},rewardForm())).toMatchObject({status:'error',message:expect.stringContaining('reward is unavailable')});
 expect(mocks.rpc).not.toHaveBeenCalled();
});
test('malformed and mixed references fail before any database operation',async()=>{
 for(const id of ['bad',caseId]){
  const data=form();data.set('rewardId',id);
  expect((await saveSupportCase({status:'idle'},data)).status).toBe('error');
 }
 expect(mocks.getUser).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
});
test('the message limit reserves space for the attached reward and preserves the full customer message',async()=>{
 const data=rewardForm();data.set('body','x'.repeat(3944));
 expect((await saveSupportCase({status:'idle'},data)).status).toBe('saved');
 expect(mocks.rpc.mock.calls[0][1].p_body.length).toBe(4000);
 mocks.rpc.mockClear();data.set('body','x'.repeat(3945));
 expect(await saveSupportCase({status:'idle'},data)).toMatchObject({status:'error',field:'body'});
 expect(mocks.rpc).not.toHaveBeenCalled();
});

test.each([true, false])("a deposit case attaches only a verified amount and reference (owned: %s)", async owned => {
  const data = form();
  data.delete("transactionId");
  data.set("deposit", transactionId);
  data.set("amount", "999999");
  mocks.rpc.mockImplementation(async name => ({ data: name === "get_demo_funding_requests"
    ? owned ? [{ id: caseId, idempotencyKey: transactionId, amount: 7300, currency: "USD", status: "processing", reconciliation: "discrepancy", created_at: "2026-11-12T12:00:00Z" }] : []
    : caseId }));
  const result = await saveSupportCase({ status: "idle" }, data);
  if (owned) {
    expect(result).toEqual({ status: "saved", caseId });
    expect(mocks.rpc).toHaveBeenLastCalledWith("create_support_case", expect.objectContaining({
      p_ledger_entry_id: null, p_category: "wallet",
      p_body: `Deposit reference: ${caseId}\nDeposit amount: $73 USD\n\nPlease check this transaction.`,
    }));
  } else {
    expect(result).toMatchObject({ status: "error", message: expect.stringContaining("deposit is unavailable") });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_demo_funding_requests");
  }
});
