import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), redirect: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
import { signInAction, signOutAction } from "./actions";

afterEach(() => vi.clearAllMocks());

test.each([
  ["/account/wallet?view=history&from=samsung-m70h-tv#add-funds", "/account/wallet?view=history&from=samsung-m70h-tv#add-funds"],
  ["/items/samsung-m70h-tv#enter-entry", "/items/samsung-m70h-tv#enter-entry"],
  ["/account/wallet?reward=samsung-m70h-tv&rewardId=11111111-1111-4111-8111-111111111111", "/account/wallet?reward=samsung-m70h-tv&rewardId=11111111-1111-4111-8111-111111111111"],
  ["/support?case=11111111-1111-4111-8111-111111111111#conversation", "/support?case=11111111-1111-4111-8111-111111111111#conversation"],
  ["https://evil.test", "/"],
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

test("ordinary sign-in without a return destination opens Home", async () => {
  mocks.createClient.mockResolvedValue({ auth: {
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email_confirmed_at: "2026-09-21" } } }),
  } });
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  const form = new FormData();
  form.set("email", "person@example.test");
  form.set("password", "test-password");
  await expect(signInAction({ ok: false, message: null }, form)).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/");
});

test("sign-out keeps the selected product available without keeping the session", async () => {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({ auth: { signOut } });
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  const form = new FormData();
  form.set("returnTo", "/items/dyson-v8-cordless-vacuum?quantity=4#enter-entry");
  await expect(signOutAction(form)).rejects.toThrow("NEXT_REDIRECT");
  expect(signOut).toHaveBeenCalledOnce();
  expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Fitems%2Fdyson-v8-cordless-vacuum%3Fquantity%3D4%23enter-entry");
});

test("sign-out ignores an unsafe return and falls back to the current product", async () => {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({ auth: { signOut } });
  mocks.headers.mockResolvedValue(new Headers({ host: "preview.example", referer: "https://preview.example/items/samsung-m70h-tv?quantity=2" }));
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  const form = new FormData();
  form.set("returnTo", "https://evil.example");
  await expect(signOutAction(form)).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Fitems%2Fsamsung-m70h-tv%3Fquantity%3D2%23enter-entry");
});
