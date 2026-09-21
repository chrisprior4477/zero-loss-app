import { beforeEach, afterEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn() }));
const authorization = vi.hoisted(() => ({ authorizeFunding: vi.fn() }));
vi.mock("./funding-authorization", () => authorization);
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { completeDemoFunding, reconcileDemoFunding, saveDemoPaymentMethod } from "./actions";
import { FundingFailure } from "./demo-provider";
const sid = "99999999-9999-4999-8999-999999999999";
const snapshot = { walletAccountId: sid, scope: "demo", currency: "USD", balanceCents: "0", transactionCount: "0", entries: [], fundingAvailable: true };
function form() {
  const value = new FormData(); value.set("amountCents", "2500"); value.set("currency", "USD"); value.set("idempotencyKey", "funding_review_check_001"); value.set("paymentMethod", "demo_card_4242"); value.set("makeDefault", "true"); return value;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  vi.stubEnv("VERCEL_ENV", "preview");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "own-user", email_confirmed_at: "2026-09-14" } } });
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "ensure_preview_customer" ? { walletAccountId: sid, scope: "demo", fundingAvailable: true }
    : name === "get_wallet_snapshot" ? snapshot
    : name === "save_demo_payment_method" ? { token: "demo_card_4242", lastFour: "4242", isDefault: true }
    : ["create_demo_card_funding_session", "resume_demo_funding_session"].includes(name) ? { id: sid }
    : name === "simulate_demo_payment" ? { body: "signed-by-demo-provider", signature: "provider-signature" }
    : { status: "succeeded", sessionId: sid } }));
});
afterEach(() => vi.unstubAllEnvs());
test("request, durable provider and verified consumer run in order and refresh shared views", async () => {
  expect((await completeDemoFunding({ status: "idle" }, form())).status).toBe("succeeded");
  expect(authorization.authorizeFunding).toHaveBeenCalledOnce();
  expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(["ensure_preview_customer", "get_wallet_snapshot", "create_demo_card_funding_session", "simulate_demo_payment", "accept_demo_payment_event"]);
  expect(mocks.rpc).toHaveBeenCalledWith("create_demo_card_funding_session", { p_amount: 2500, p_idempotency_key: "funding_review_check_001", p_payment_method: "demo_card_4242", p_make_default: true });
  expect(mocks.rpc).toHaveBeenCalledWith("accept_demo_payment_event", { p_body: "signed-by-demo-provider", p_signature: "provider-signature" });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
test("failed password authorization never creates or processes a payment", async () => {
  authorization.authorizeFunding.mockRejectedValue(new FundingFailure("P0001", "Password confirmation failed."));
  expect(await completeDemoFunding({ status: "idle" }, form())).toEqual({ status: "error", message: "Password confirmation failed." });
  expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(["ensure_preview_customer", "get_wallet_snapshot"]);
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
  expect((await completeDemoFunding({ status: "idle" }, form())).status).toBe("error"); expect(mocks.rpc).not.toHaveBeenCalled();
});
test("wrong database environment denies funding", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://other.supabase.co");
  expect((await completeDemoFunding({ status: "idle" }, form())).status).toBe("error"); expect(mocks.rpc).not.toHaveBeenCalled();
});
test("read-only permission cannot reach a write path, including simultaneous calls", async () => {
  mocks.rpc.mockImplementation(async name => ({ data: name === "ensure_preview_customer"
    ? { walletAccountId: sid, scope: "demo", fundingAvailable: true }
    : { ...snapshot, fundingAvailable: false } }));
  const replies = await Promise.all(Array.from({ length: 5 }, () => completeDemoFunding({ status: "idle" }, form())));
  expect(replies.every(reply => reply.status === "error")).toBe(true);
  expect(mocks.rpc.mock.calls.every(call => ["ensure_preview_customer", "get_wallet_snapshot"].includes(call[0]))).toBe(true);
});
test.each(["simulate_demo_payment", "accept_demo_payment_event"])("lost %s response is unknown, not declined or unchanged", async lost => {
  mocks.rpc.mockImplementation(async name => {
    if (name === lost) throw new Error("network timeout after commit");
    return { data: name === "ensure_preview_customer" ? { walletAccountId: sid, scope: "demo", fundingAvailable: true } : name === "get_wallet_snapshot" ? snapshot : name === "create_demo_card_funding_session" ? { id: sid } : { body: "receipt", signature: "signed" } };
  });
  expect((await completeDemoFunding({ status: "idle" }, form())).status).toBe("pending");
  if (lost === "simulate_demo_payment") expect(mocks.rpc.mock.calls.some(call => call[0] === "accept_demo_payment_event")).toBe(false);
});
test("database rate limit stops before provider simulation", async () => {
  mocks.rpc.mockImplementation(async name => name === "ensure_preview_customer" ? { data: { walletAccountId: sid, scope: "demo", fundingAvailable: true } } : name === "get_wallet_snapshot" ? { data: snapshot } : { error: { code: "P0001", message: "Demo limit reached" } });
  expect(await completeDemoFunding({ status: "idle" }, form())).toEqual({ status: "error", message: "Demo limit reached" });
  expect(mocks.rpc).toHaveBeenCalledTimes(3);
});
test("reconciliation retries existing session, never creates a replacement", async () => {
  const f = new FormData(); f.set("sessionId", sid);
  expect((await reconcileDemoFunding({ status: "idle" }, f)).status).toBe("succeeded");
  expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(["ensure_preview_customer", "get_wallet_snapshot", "simulate_demo_payment", "accept_demo_payment_event"]);
});
test("reconciliation rejects malformed identifier before any RPC", async () => {
  const f = new FormData(); f.set("sessionId", "not-an-id");
  expect((await reconcileDemoFunding({ status: "idle" }, f)).status).toBe("error"); expect(mocks.rpc).not.toHaveBeenCalled();
});

test.each(["", "a-real-card-token", "4242424242424242"])("rejects unsupported method %s before database access", async method => {
  const f = form(); f.set("paymentMethod", method);
  expect((await completeDemoFunding({ status: "idle" }, f)).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("default is explicit, not truthy coercion", async () => {
  const f = form(); f.set("makeDefault", "false");
  expect((await completeDemoFunding({ status: "idle" }, f)).status).toBe("succeeded");
  expect(mocks.rpc).toHaveBeenCalledWith("create_demo_card_funding_session", expect.objectContaining({ p_make_default: false }));
  mocks.rpc.mockClear(); f.delete("makeDefault");
  expect((await completeDemoFunding({ status: "idle" }, f)).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("legacy browser recovery only looks up an existing request", async () => {
  const f = form(); f.delete("paymentMethod"); f.delete("makeDefault"); f.set("recoveryOnly", "true");
  expect((await completeDemoFunding({ status: "idle" }, f)).status).toBe("succeeded");
  expect(mocks.rpc).toHaveBeenCalledWith("resume_demo_funding_session", { p_amount: 2500, p_idempotency_key: "funding_review_check_001" });
  expect(mocks.rpc.mock.calls.some(call => call[0].startsWith("create_demo"))).toBe(false);
  expect(authorization.authorizeFunding).not.toHaveBeenCalled();
});

test("saved card uses the confirmed preview account boundary without funding", async () => {
  const value = new FormData(); value.set("paymentMethod", "demo_card_4242"); value.set("makeDefault", "true");
  expect(await saveDemoPaymentMethod({ status: "idle" }, value)).toEqual({ status: "succeeded", message: "Test card •••• 4242 saved as your default. No real card details were stored." });
  expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(["ensure_preview_customer", "get_wallet_snapshot", "save_demo_payment_method"]);
  expect(mocks.rpc).toHaveBeenCalledWith("save_demo_payment_method", { p_payment_method: "demo_card_4242", p_make_default: true });
  expect(mocks.rpc.mock.calls.some(call => call[0].includes("funding_session"))).toBe(false);
});

test.each(["", "4242424242424242", "real_card_token"])("saved card rejects unsafe method %s before database access", async method => {
  const value = new FormData(); value.set("paymentMethod", method); value.set("makeDefault", "true");
  expect((await saveDemoPaymentMethod({ status: "idle" }, value)).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
