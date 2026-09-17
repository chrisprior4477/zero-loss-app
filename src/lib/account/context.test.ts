import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), snapshot: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser }, from: mocks.from,
  storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `/saved/${path}` } }) }) },
}) }));
vi.mock("@/lib/wallet/balance", () => ({ getWalletSnapshot: mocks.snapshot }));
import { getAccountContext } from "./context";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "own-account", email: "Case@example.test", email_confirmed_at: "2026-09-14" } } });
  mocks.from.mockReturnValue({ select: () => ({ eq: mocks.eq }) });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: { display_name: "McDonald", legal_first_name: "lowercase", avatar_reference: "photo.webp" } });
  mocks.snapshot.mockResolvedValue({ balanceCents: 0, transactionCount: 0, scope: "production" });
});
test("reads only own profile and snapshot; normal permission never receives fixtures", async () => {
  const account = await getAccountContext();
  expect(mocks.from).toHaveBeenCalledWith("customer_profiles");
  expect(mocks.eq).toHaveBeenCalledWith("customer_id", "own-account");
  expect(mocks.snapshot).toHaveBeenCalledWith("own-account");
  expect(account).toMatchObject({ displayName: "McDonald", email: "Case@example.test", avatarUrl: "/saved/photo.webp", balanceLabel: "$0.00", activity: { activity: [], activeCount: 0 } });
});
test("ordinary account context never substitutes hardcoded activity for ledger data", async () => {
  mocks.snapshot.mockResolvedValue({ balanceCents: 2500, transactionCount: 1, scope: "demo" });
  const account = await getAccountContext();
  expect(account?.activity).toMatchObject({ activity: [], activeCount: 0, isPreview: false, source: "checkpoint-one-empty" });
  expect(account?.wallet?.scope).toBe("demo");
  expect(account?.balanceLabel).toBe("$25");
  // Mock client intentionally has no rpc(), insert(), update() or delete().
  // The context cannot enroll the user or write any wallet/activity records.
});
test("snapshot failure stays unavailable and never receives visual examples", async () => {
  mocks.snapshot.mockRejectedValue(new Error("database offline"));
  const account = await getAccountContext();
  expect(account?.wallet).toBeNull();
  expect(account?.balanceLabel).toBe("Unavailable");
});
test("invalid authentication stops before any profile, balance or capability read", async () => {
  mocks.getUser.mockResolvedValue({ error: new Error("expired"), data: { user: null } });
  expect(await getAccountContext()).toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.snapshot).not.toHaveBeenCalled();
});
