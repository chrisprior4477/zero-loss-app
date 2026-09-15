import { beforeEach, expect, test, vi } from "vitest";

const { rpc, getUser } = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser }, rpc }) }));
import { getWalletSnapshot } from "./balance";

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
});

test("a database error never becomes a zero dollar balance", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "network failure" } });
  await expect(getWalletSnapshot("user-a")).rejects.toThrow("unavailable");
});

test("caller cannot request another customer's wallet snapshot", async () => {
  await expect(getWalletSnapshot("user-b")).rejects.toThrow("authentication");
  expect(rpc).not.toHaveBeenCalled();
});

test("an authoritative zero remains distinguishable from an unavailable balance", async () => {
  rpc.mockResolvedValue({ data: { walletAccountId: null, scope: "production", currency: "USD", balanceCents: "0", transactionCount: "0", fundingAvailable: false, entries: [] }, error: null });
  await expect(getWalletSnapshot("user-a")).resolves.toMatchObject({ balanceCents: 0 });
  expect(rpc).toHaveBeenCalledWith("get_wallet_snapshot");
});
