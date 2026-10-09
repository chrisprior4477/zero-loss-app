import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { resetDemoPool } from "./actions";

const demoWallet = { walletAccountId: "99999999-9999-4999-8999-999999999999", scope: "demo", currency: "USD", balanceCents: "0", transactionCount: "0", fundingAvailable: true, entries: [] };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  vi.stubEnv("VERCEL_ENV", "preview");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "demo-user", email_confirmed_at: "2026-10-08" } } });
  mocks.rpc.mockImplementation(async (name: string) => name === "get_wallet_snapshot"
    ? { data: demoWallet }
    : { data: { remaining: 1, alreadyOpen: false } });
});
afterEach(() => vi.unstubAllEnvs());

test("resets only a confirmed demo account's named full pool", async () => {
  expect(await resetDemoPool("dunkin-25-gift-card")).toEqual({ status: "succeeded", message: "Demo pool reset. One ticket is available again." });
  expect(mocks.rpc).toHaveBeenCalledWith("reset_demo_pool", { p_offering_slug: "dunkin-25-gift-card" });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});

test("never calls the reset RPC outside preview or with an invalid slug", async () => {
  vi.stubEnv("APP_DATA_ENVIRONMENT", "production");
  expect((await resetDemoPool("dunkin-25-gift-card")).status).toBe("error");
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  expect((await resetDemoPool("../../other-offer")).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("rejects a non-demo wallet and an unconfirmed user", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { ...demoWallet, scope: "production" } });
  expect((await resetDemoPool("dunkin-25-gift-card")).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalledWith("reset_demo_pool", expect.anything());
  mocks.getUser.mockResolvedValue({ data: { user: { id: "demo-user", email_confirmed_at: null } } });
  expect((await resetDemoPool("dunkin-25-gift-card")).status).toBe("error");
});

test("does not announce success when the database response is uncertain", async () => {
  mocks.rpc.mockImplementation(async (name: string) => name === "get_wallet_snapshot" ? { data: demoWallet } : { data: null });
  expect((await resetDemoPool("dunkin-25-gift-card")).status).toBe("error");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
