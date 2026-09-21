import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { parseDemoVerification } from "./demo-verification";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
import { beginDemoVerification, advanceDemoVerification } from "./demo-verification-actions";
const id = "97999999-9999-4999-8999-999999999971";
const sample = { id, reference: "ver_abcdef", provider: "demo", step: "start" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test"); vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  mocks.getUser.mockResolvedValue({ data: { user: { id, email_confirmed_at: "2026-09-21" } } });
  mocks.rpc.mockResolvedValue({ data: sample });
});
afterEach(() => vi.unstubAllEnvs());
test("session reader only returns the permitted metadata", () => {
  expect(parseDemoVerification({ ...sample, ssn: "must-not-cross-boundary" })).toEqual(sample);
  expect(parseDemoVerification({ ...sample, provider: "live" })).toBeNull();
  expect(parseDemoVerification({ ...sample, step: "verified" })).toBeNull();
});
test("begin validates the authenticated account, uses reward id and no customer-supplied identity", async () => {
  expect(await beginDemoVerification(id)).toEqual({ verification: sample });
  expect(mocks.getUser).toHaveBeenCalledOnce();
  expect(mocks.rpc).toHaveBeenCalledWith("begin_demo_identity_verification", { p_reward_id: id });
});
test("steps only submit a fixed fixture reference", async () => {
  await advanceDemoVerification(id, "consent");
  expect(mocks.rpc).toHaveBeenCalledWith("advance_demo_identity_verification", { p_verification_id: id, p_step: "consent", p_fixture: "sample-adult-v1" });
});
test("malformed requests stop before auth and database access", async () => {
  expect((await beginDemoVerification("not-a-reward")).error).toBeTruthy();
  expect((await advanceDemoVerification(id, "start")).error).toBeTruthy();
  expect(mocks.getUser).not.toHaveBeenCalled();
});
test("unconfirmed and signed-out sessions cannot use the demo", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id } } });
  expect((await beginDemoVerification(id)).error).toContain("Sign in");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("production remains blocked even if the same database URL is configured", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  expect((await beginDemoVerification(id)).error).toContain("not enabled");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("unsafe errors are not exposed and interrupted steps remain retryable", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "500", message: "internal sensitive details" } });
  expect((await beginDemoVerification(id)).error).not.toContain("sensitive");
  mocks.rpc.mockRejectedValue(new Error("network"));
  expect((await advanceDemoVerification(id, "details")).error).toContain("Retry");
});
