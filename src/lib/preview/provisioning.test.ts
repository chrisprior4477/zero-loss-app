import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { PREVIEW_SUPABASE_URL } from "./environment";
import { ensurePreviewCustomer, PreviewProvisioningError } from "./provisioning";

const rpc = vi.fn();
const user = { id: "own-user", email_confirmed_at: "2026-09-17T12:00:00Z" } as User;
const db = { rpc } as unknown as SupabaseClient;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PREVIEW_SUPABASE_URL);
  vi.stubEnv("VERCEL_ENV", "preview");
  rpc.mockResolvedValue({ data: {
    walletAccountId: "99999999-9999-4999-8999-999999999999",
    scope: "demo",
    fundingAvailable: true,
  } });
});
afterEach(() => vi.unstubAllEnvs());

test("calls the no-argument authoritative RPC", async () => {
  await expect(ensurePreviewCustomer(db, user)).resolves.toMatchObject({ required: true, succeeded: true });
  expect(rpc).toHaveBeenCalledWith("ensure_preview_customer");
  expect(rpc.mock.calls[0]).toHaveLength(1);
});

test("does not call preview provisioning in production", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  await expect(ensurePreviewCustomer(db, user)).resolves.toEqual({ required: false, succeeded: true });
  expect(rpc).not.toHaveBeenCalled();
});

test("rejects an unconfirmed session before database access", async () => {
  await expect(ensurePreviewCustomer(db, { ...user, email_confirmed_at: undefined })).rejects.toBeInstanceOf(PreviewProvisioningError);
  expect(rpc).not.toHaveBeenCalled();
});

test("rejects malformed database responses instead of inventing a wallet", async () => {
  rpc.mockResolvedValue({ data: { walletAccountId: null, scope: "demo" } });
  await expect(ensurePreviewCustomer(db, user)).rejects.toThrow("invalid response");
});
