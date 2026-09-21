import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), resend: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signUp: mocks.signUp, resend: mocks.resend } }) }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
import { signUpAction, resendVerificationAction } from "./actions";

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_BRANCH_URL", "zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app");
  mocks.signUp.mockResolvedValue({ data: { user: { identities: [{ id: "test" }] }, session: null }, error: null });
  mocks.resend.mockResolvedValue({ error: null });
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

test.each(["/items/samsung-m70h-tv#enter-entry", "/account/wallet?view=history&from=samsung-m70h-tv#add-funds", "https://evil.test"])("signup and resend use an allowed callback carrying only a safe destination: %s", async destination => {
  const form = new FormData();
  Object.entries({ legal_first_name: "Test", legal_last_name: "Person", date_of_birth: "1990-01-01", email: "test@example.test", password: "test-password", confirm_password: "test-password", accepted_terms: "on", returnTo: destination, verification_email: "test@example.test" }).forEach(([key, value]) => form.set(key, value));
  expect((await signUpAction({ ok: false, message: null }, form)).pendingVerification).toBe(true);
  await resendVerificationAction({ ok: false, message: null }, form);
  const signupUrl = new URL(mocks.signUp.mock.calls[0][0].options.emailRedirectTo);
  expect(signupUrl.origin).toBe("https://zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app");
  expect(signupUrl.pathname).toBe("/auth/confirm");
  expect(signupUrl.searchParams.get("next")).toBe(destination.startsWith("/") ? destination : null);
  expect(mocks.resend.mock.calls[0][0].options.emailRedirectTo).toBe(signupUrl.href);
});
