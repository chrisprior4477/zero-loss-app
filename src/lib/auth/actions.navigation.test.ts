import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { signInAction } from "./actions";

afterEach(() => vi.clearAllMocks());

test.each([
  ["/account/wallet?view=history&from=samsung-m70h-tv#add-funds", "/account/wallet?view=history&from=samsung-m70h-tv#add-funds"],
  ["/items/samsung-m70h-tv#enter-entry", "/items/samsung-m70h-tv#enter-entry"],
  ["https://evil.test", "/account/entries"],
])("sign-in returns only to an approved in-site destination: %s", async (returnTo, expected) => {
  mocks.createClient.mockResolvedValue({ auth: {
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email_confirmed_at: "2026-09-21" } } }),
  } });
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  const form = new FormData();
  form.set("email", "person@example.test");
  form.set("password", "test-password");
  form.set("returnTo", returnTo);
  await expect(signInAction({ ok: false, message: null }, form)).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith(expected);
});
