import { afterEach, expect, test, vi } from "vitest";

const mock = vi.hoisted(() => ({
  preview: true,
  user: { email_confirmed_at: "2026-10-16T12:00:00Z" } as { email_confirmed_at: string } | null,
  rpc: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: () => mock.preview }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: mock.user }, error: null }) }, rpc: mock.rpc,
}) }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
import { clearDemoWalletHistory, previewDemoHistoryClear } from "./demo-history-actions";

const snapshot = { walletAccountId: "11111111-1111-4111-8111-111111111111", scope: "demo", currency: "USD", balanceCents: "2500", transactionCount: "0", fundingAvailable: true, entries: [] };
afterEach(() => { mock.preview = true; mock.user = { email_confirmed_at: "2026-10-16T12:00:00Z" }; mock.rpc.mockReset(); mock.revalidate.mockReset(); });

test("deposit preview refuses unresolved payment requests", async () => {
  mock.rpc.mockImplementation(async (name: string) => name === "get_wallet_snapshot"
    ? { data: snapshot, error: null }
    : { data: [{ reconciliation: "credit_pending" }], error: null });
  expect(await previewDemoHistoryClear("deposits")).toMatchObject({ status: "error", message: expect.stringContaining("pending") });
  expect(mock.rpc).not.toHaveBeenCalledWith("clear_demo_wallet_history", expect.anything());
});

test("clearing demo history passes expected balance and idempotency key to the owner-scoped RPC", async () => {
  mock.rpc.mockImplementation(async (name: string) => name === "get_wallet_snapshot"
    ? { data: snapshot, error: null }
    : { data: { hiddenCount: 3, clearedCents: "2500" }, error: null });
  const key = "stable_demo_history_reset_01";
  expect(await clearDemoWalletHistory("deposits", 2500, key)).toEqual({ status: "succeeded", hiddenCount: 3, clearedCents: 2500 });
  expect(mock.rpc).toHaveBeenCalledWith("clear_demo_wallet_history", {
    p_kind: "deposits", p_expected_balance_cents: 2500, p_request_key: key,
  });
  expect(mock.revalidate).toHaveBeenCalledWith("/", "layout");
});

test("history reset is unavailable outside the preview environment", async () => {
  mock.preview = false;
  expect(await clearDemoWalletHistory("transactions", 2500, "stable_demo_history_reset_01")).toMatchObject({ status: "error" });
  expect(mock.rpc).not.toHaveBeenCalled();
});
