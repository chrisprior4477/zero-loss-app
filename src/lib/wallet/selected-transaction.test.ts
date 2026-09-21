import { beforeEach, expect, test, vi } from "vitest";
import type { WalletSnapshot } from "./snapshot";
const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks }));
import { selectedTransaction } from "./selected-transaction";
const id = "11111111-1111-4111-8111-111111111111";
const entry = { id, entry_type: "DEPOSIT", amount: 100, created_at: "2026-09-21T12:00:00Z" };
const wallet: WalletSnapshot = { walletAccountId: id, scope: "demo", currency: "USD", balanceCents: 100, transactionCount: 51, fundingAvailable: true, entries: [] };
beforeEach(() => {
  vi.resetAllMocks();
  [mocks.from, mocks.select, mocks.eq].forEach(fn => fn.mockReturnValue(mocks));
  mocks.maybeSingle.mockResolvedValue({ data: entry, error: null });
});
test("the recent snapshot needs no extra database lookup", async () => {
  expect(await selectedTransaction(id, "owner", { ...wallet, entries: [entry] })).toEqual({ requested: true, entry });
  expect(mocks.from).not.toHaveBeenCalled();
});
test("an older transaction uses the permitted owner-scoped RLS read", async () => {
  expect(await selectedTransaction(id, "owner", wallet)).toEqual({ requested: true, entry });
  expect(mocks.select).toHaveBeenCalledWith("id,entry_type,amount,created_at");
  expect(mocks.eq.mock.calls).toEqual([["customer_id", "owner"], ["id", id]]);
});
test.each(["bad", [id, id], null])("invalid selector cannot query the Ledger: %s", async value => {
  expect(await selectedTransaction(value, "owner", wallet)).toEqual({ requested: true, entry: null });
  expect(mocks.from).not.toHaveBeenCalled();
});
test("missing wallet and absent selection never perform a private lookup", async () => {
  expect(await selectedTransaction(id, "owner", null)).toEqual({ requested: true, entry: null });
  expect(await selectedTransaction(undefined, "owner", wallet)).toEqual({ requested: false, entry: null });
  expect(mocks.from).not.toHaveBeenCalled();
});
test.each([
  { data: null, error: null }, { data: entry, error: { message: "unavailable" } },
  { data: { ...entry, id: "another" }, error: null }, { data: { ...entry, amount: "100" }, error: null },
  { data: { ...entry, created_at: "invalid" }, error: null },
])("unauthorized, failed or invalid responses cannot display a selected transaction", async result => {
  mocks.maybeSingle.mockResolvedValue(result);
  expect(await selectedTransaction(id, "owner", wallet)).toEqual({ requested: true, entry: null });
});
