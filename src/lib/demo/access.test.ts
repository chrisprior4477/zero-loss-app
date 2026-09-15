import { beforeEach, expect, test, vi } from "vitest";
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
import { canAccessInvestorPreview } from "./access";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("INVESTOR_PREVIEW_EMAILS", "owner@example.test");
  vi.stubEnv("INVESTOR_PREVIEW_ENABLED", "true");
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("INVESTOR_PREVIEW_PROJECT_REF", "test-ref");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test-ref.supabase.co");
  vi.stubEnv("VERCEL_ENV", "preview");
  getUser.mockResolvedValue({ data: { user: null } });
});
test("localhost never bypasses authentication", async () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(await canAccessInvestorPreview()).toBe(false);
});
test("a confirmed but unallowlisted customer cannot access fixtures", async () => {
  getUser.mockResolvedValue({ data: { user: { email: "customer@example.test", email_confirmed_at: "2026-09-14", user_metadata: { demo: true } } } });
  expect(await canAccessInvestorPreview()).toBe(false);
});
test("an unconfirmed allowlisted email is insufficient", async () => {
  getUser.mockResolvedValue({ data: { user: { email: "owner@example.test" } } });
  expect(await canAccessInvestorPreview()).toBe(false);
});
test("verified allowlisted identity can view the protected preview", async () => {
  getUser.mockResolvedValue({ data: { user: { email: "owner@example.test", email_confirmed_at: "2026-09-14" } } });
  expect(await canAccessInvestorPreview()).toBe(true);
});
test("missing configuration fails closed", async () => {
  vi.stubEnv("INVESTOR_PREVIEW_EMAILS", "");
  expect(await canAccessInvestorPreview()).toBe(false);
});

test.each([
  ["INVESTOR_PREVIEW_ENABLED", "false"],
  ["APP_DATA_ENVIRONMENT", "production"],
  ["VERCEL_ENV", "production"],
  ["INVESTOR_PREVIEW_PROJECT_REF", "another-project"],
  ["INVESTOR_PREVIEW_PROJECT_REF", ""],
])("%s=%s denies preview even for an allowlisted identity", async (key, value) => {
  vi.stubEnv(key, value);
  getUser.mockResolvedValue({ data: { user: { email: "owner@example.test", email_confirmed_at: "2026-09-14" } } });
  expect(await canAccessInvestorPreview()).toBe(false);
});

test("authentication error cannot grant preview", async () => {
  getUser.mockResolvedValue({ error: new Error("session expired"), data: { user: { email: "owner@example.test", email_confirmed_at: "2026-09-14" } } });
  expect(await canAccessInvestorPreview()).toBe(false);
});
