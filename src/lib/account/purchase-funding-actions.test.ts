import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ funding: vi.fn(), rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/payments/actions", () => ({ completeDemoFunding: mocks.funding }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
import { fundPurchaseWallet } from "./purchase-funding-actions";
beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } }); });
test("returns a verified ledger projection, not a client-calculated deposit sum", async () => {
  mocks.funding.mockResolvedValue({ status: "succeeded", message: "Saved" });
  mocks.rpc.mockResolvedValue({ data: { walletAccountId: "11111111-1111-4111-8111-111111111111", scope: "demo", currency: "USD", balanceCents: "44850", transactionCount: "0", fundingAvailable: true, entries: [] } });
  const form = new FormData(); form.set("returnTo", "/account/entries?item=other");
  expect(await fundPurchaseWallet(form)).toMatchObject({ status: "succeeded", balanceCents: 44850 }); expect(form.has("returnTo")).toBe(false);
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_wallet_snapshot");
});
test("a confirmed deposit with a failed balance read blocks a second deposit", async () => {
  mocks.funding.mockResolvedValue({ status: "already_credited", message: "Saved earlier" }); mocks.rpc.mockResolvedValue({ error: { message: "network" } });
  expect(await fundPurchaseWallet(new FormData())).toMatchObject({ status: "pending" }); expect(mocks.funding).toHaveBeenCalledOnce();
});
test("payment uncertainty passes through without reading or inventing a balance", async () => {
  mocks.funding.mockResolvedValue({ status: "pending", message: "Check deposit" }); expect(await fundPurchaseWallet(new FormData())).toEqual({ status: "pending", message: "Check deposit" }); expect(mocks.rpc).not.toHaveBeenCalled();
});
