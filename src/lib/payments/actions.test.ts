import { beforeEach, afterEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { completeDemoFunding, reconcileDemoFunding } from "./actions";
const sid = "99999999-9999-4999-8999-999999999999";
const snapshot = { walletAccountId: sid, scope: "demo", currency: "USD", balanceCents: "0", transactionCount: "0", entries: [], fundingAvailable: true };
function form() {
  const value = new FormData(); value.set("amountCents", "2500"); value.set("currency", "USD"); value.set("idempotencyKey", "funding_review_check_001"); return value;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  vi.stubEnv("VERCEL_ENV", "preview");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "own-user", email_confirmed_at: "2026-09-14" } } });
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "get_wallet_snapshot" ? snapshot
    : name === "create_demo_funding_session" ? { id: sid }
    : name === "simulate_demo_payment" ? { body: "signed-by-demo-provider", signature: "provider-signature" }
    : { status: "succeeded", sessionId: sid } }));
});
afterEach(() => vi.unstubAllEnvs());
test("request, durable provider and verified consumer run in order and refresh shared views", async () => {
  expect((await completeDemoFunding({ status: "idle" }, form())).status).toBe("succeeded");
  expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(["get_wallet_snapshot", "create_demo_funding_session", "simulate_demo_payment", "accept_demo_payment_event"]);
  expect(mocks.rpc).toHaveBeenCalledWith("create_demo_funding_session", { p_amount: 2500, p_idempotency_key: "funding_review_check_001" });
  expect(mocks.rpc).toHaveBeenCalledWith("accept_demo_payment_event", { p_body: "signed-by-demo-provider", p_signature: "provider-signature" });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
test.each(["EUR", "", "usd"])("rejects altered currency %s before database access", async currency => {
  const f = form(); f.set("currency", currency);
  expect((await completeDemoFunding({ status: "idle" }, f)).status).toBe("error"); expect(mocks.rpc).not.toHaveBeenCalled();
});
test.each(["0", "99", "50001", "2500.5", "NaN", "Infinity"])("rejects unsafe amount %s", async amount => {
  const f = form(); f.set("amountCents", amount);
  expect((await completeDemoFunding({ status: "idle" }, f)).status).toBe("error"); expect(mocks.rpc).not.toHaveBeenCalled();
});
test("unconfirmed accounts cannot fund", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "own-user" } } });
  expect((await completeDemoFunding({ status: "idle" }, form())).status).toBe("error"); expect(mocks.rpc).not.toHaveBeenCalled();
});
test("production deployment denies funding despite test database permission", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  expect((await completeDemoFunding({ status: "idle" }, form())).status).toBe("error"); expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
test("wrong database environment denies funding", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://other.supabase.co");
  expect((await completeDemoFunding({ status: "idle" }, form())).status).toBe("error"); expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
test("read-only permission cannot reach a write path, including simultaneous calls", async () => {
  mocks.rpc.mockResolvedValue({ data: { ...snapshot, fundingAvailable: false } });
  const replies = await Promise.all(Array.from({ length: 5 }, () => completeDemoFunding({ status: "idle" }, form())));
  expect(replies.every(reply => reply.status === "error")).toBe(true);
  expect(mocks.rpc.mock.calls.every(call => call[0] === "get_wallet_snapshot")).toBe(true);
});
test.each(["simulate_demo_payment", "accept_demo_payment_event"])("lost %s response is unknown, not declined or unchanged", async lost => {
  mocks.rpc.mockImplementation(async name => {
    if (name === lost) throw new Error("network timeout after commit");
    return { data: name === "get_wallet_snapshot" ? snapshot : name === "create_demo_funding_session" ? { id: sid } : { body: "receipt", signature: "signed" } };
  });
  expect((await completeDemoFunding({ status: "idle" }, form())).status).toBe("pending");
  if (lost === "simulate_demo_payment") expect(mocks.rpc.mock.calls.some(call => call[0] === "accept_demo_payment_event")).toBe(false);
});
test("database rate limit stops before provider simulation", async () => {
  mocks.rpc.mockImplementation(async name => name === "get_wallet_snapshot" ? { data: snapshot } : { error: { code: "P0001", message: "Demo limit reached" } });
  expect(await completeDemoFunding({ status: "idle" }, form())).toEqual({ status: "error", message: "Demo limit reached" });
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
test("reconciliation retries existing session, never creates a replacement", async () => {
  const f = new FormData(); f.set("sessionId", sid);
  expect((await reconcileDemoFunding({ status: "idle" }, f)).status).toBe("succeeded");
  expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(["get_wallet_snapshot", "simulate_demo_payment", "accept_demo_payment_event"]);
});
test("reconciliation rejects malformed identifier before any RPC", async () => {
  const f = new FormData(); f.set("sessionId", "not-an-id");
  expect((await reconcileDemoFunding({ status: "idle" }, f)).status).toBe("error"); expect(mocks.rpc).not.toHaveBeenCalled();
});
