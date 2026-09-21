import { beforeEach, afterEach, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ create: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.create }));
import { authorizeFunding } from "./funding-authorization";
const attempt = vi.fn();
const requestKey = "test-request-00000000";
const db = { auth: { getUser: mocks.getUser }, rpc: attempt } as unknown as SupabaseClient;
function form() { const f = new FormData(); f.set("password", "test-only-password"); f.set("fundingPolicy", "funding-confirmation-v1"); f.set("makeDefault", "false"); return f; }
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner", email: "owner@example.test", email_confirmed_at: "2026-09-21" } } });
  mocks.signIn.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.signOut.mockResolvedValue({ error: null }); mocks.rpc.mockResolvedValue({ error: null });
  attempt.mockResolvedValue({ data: "attempt-id", error: null });
  mocks.create.mockReturnValue({ auth: { signInWithPassword: mocks.signIn, signOut: mocks.signOut }, rpc: mocks.rpc });
});
afterEach(() => vi.unstubAllEnvs());
test("fresh isolated authentication binds exact amount and key; password is never sent to the database", async () => {
  await authorizeFunding(db, form(), 2500, requestKey);
  expect(mocks.signIn).toHaveBeenCalledWith({ email: "owner@example.test", password: "test-only-password" });
  expect(attempt).toHaveBeenCalledWith("begin_demo_funding_authentication", { p_amount: 2500, p_request_key: requestKey });
  expect(mocks.rpc).toHaveBeenCalledWith("authorize_demo_funding", { p_amount: 2500, p_request_key: requestKey, p_make_default: false, p_policy_version: "funding-confirmation-v1" });
  expect(mocks.create).toHaveBeenCalledWith(expect.any(String), expect.any(String), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});
test.each(["password", "fundingPolicy"])("missing %s cannot authorize a deposit", async field => {
  const f = form(); f.delete(field);
  await expect(authorizeFunding(db, f, 2500, requestKey)).rejects.toThrow("Confirm the deposit");
  expect(mocks.create).not.toHaveBeenCalled();
});
test.each(["bad-password", "other-account"])("%s never grants authorization", async kind => {
  mocks.signIn.mockResolvedValue(kind === "bad-password" ? { data: { user: null }, error: {} } : { data: { user: { id: "someone-else" } }, error: null });
  await expect(authorizeFunding(db, form(), 2500, requestKey)).rejects.toThrow("verify your password");
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.signOut).toHaveBeenCalled();
});
test("database rejection never claims authorization", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "private internal error" } });
  await expect(authorizeFunding(db, form(), 2500, requestKey)).rejects.toThrow("couldn’t authorize");
  expect(mocks.signOut).toHaveBeenCalled();
});
test("account throttle prevents another password attempt", async () => {
  attempt.mockResolvedValue({ error: { code: "P0001" } });
  await expect(authorizeFunding(db, form(), 2500, requestKey)).rejects.toThrow("Wait 15 minutes");
  expect(mocks.create).not.toHaveBeenCalled();
});
test("unverified identity never attempts password authentication", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: {} });
  await expect(authorizeFunding(db, form(), 2500, requestKey)).rejects.toThrow("Sign in again");
  expect(attempt).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
});
test("network error during verification revokes only the isolated session", async () => {
  mocks.rpc.mockRejectedValue(new Error("network unavailable"));
  await expect(authorizeFunding(db, form(), 2500, requestKey)).rejects.toThrow("network unavailable");
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});
