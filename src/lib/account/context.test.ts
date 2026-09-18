import { afterEach, beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), snapshot: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser }, from: mocks.from, rpc: mocks.rpc,
  storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `/saved/${path}` } }) }) },
}) }));
vi.mock("@/lib/wallet/balance", () => ({ getWalletSnapshot: mocks.snapshot }));
import { getAccountContext } from "./context";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  vi.stubEnv("VERCEL_ENV", "preview");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "own-account", email: "Case@example.test", email_confirmed_at: "2026-09-14", created_at: "2025-03-14T10:00:00Z", last_sign_in_at: "2026-09-16T14:24:00Z", phone: "+15551234821" } } });
  mocks.rpc.mockImplementation(async (name: string) => name === "ensure_preview_customer"
    ? { data: { walletAccountId: "99999999-9999-4999-8999-999999999999", scope: "demo", fundingAvailable: true } }
    : { data: [] });
  mocks.from.mockReturnValue({ select: () => ({ eq: mocks.eq }) });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: { display_name: "McDonald", legal_first_name: "lowercase", legal_last_name: "de la Cruz", date_of_birth: "1990-01-01", preferred_locale: "en-US", timezone: "America/New_York", avatar_reference: "photo.webp", phone_number: "(910) 555-0147", address_line_1: "125 Market Street", address_line_2: "Unit 4", city: "Wilmington", region: "NC", postal_code: "28401", country: "United States" } });
  mocks.snapshot.mockResolvedValue({ balanceCents: 0, transactionCount: 0, scope: "demo", fundingAvailable: true });
});
afterEach(() => vi.unstubAllEnvs());
test("reads only own profile and snapshot; normal permission never receives fixtures", async () => {
  const account = await getAccountContext();
  expect(mocks.rpc).toHaveBeenCalledWith("ensure_preview_customer");
  expect(mocks.from).toHaveBeenCalledWith("customer_profiles");
  expect(mocks.eq).toHaveBeenCalledWith("customer_id", "own-account");
  expect(mocks.snapshot).toHaveBeenCalledWith("own-account");
  expect(mocks.rpc).toHaveBeenCalledWith("get_account_activity");
  expect(account).toMatchObject({ displayName: "McDonald", legalFirstName: "lowercase", legalLastName: "de la Cruz", dateOfBirth: "1990-01-01", email: "Case@example.test", memberSince: "2025-03-14T10:00:00Z", lastSignInAt: "2026-09-16T14:24:00Z", phone: "(910) 555-0147", addressLine1: "125 Market Street", city: "Wilmington", region: "NC", postalCode: "28401", country: "United States", avatarUrl: "/saved/photo.webp", balanceLabel: "$0.00", fundingEnabled: true, activity: { activity: [], activeCount: 0, isPreview: true, source: "customer-empty" } });
});
test("ordinary account context never substitutes hardcoded activity for ledger data", async () => {
  mocks.snapshot.mockResolvedValue({ balanceCents: 2500, transactionCount: 1, scope: "demo" });
  const account = await getAccountContext();
  expect(account?.activity).toMatchObject({ activity: [], activeCount: 0, isPreview: true, source: "customer-empty" });
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
test("provisioning failure stays unavailable and never reports zero", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "XX000", message: "database unavailable" } });
  const account = await getAccountContext();
  expect(account?.wallet).toBeNull();
  expect(account?.balanceLabel).toBe("Unavailable");
  expect(mocks.snapshot).not.toHaveBeenCalled();
});
test("invalid authentication stops before any profile, balance or capability read", async () => {
  mocks.getUser.mockResolvedValue({ error: new Error("expired"), data: { user: null } });
  expect(await getAccountContext()).toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.snapshot).not.toHaveBeenCalled();
});
