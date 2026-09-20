import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { changeAccountPasswordAction, requestPasswordResetAction, updateRecoveredPasswordAction } from "./actions";

const initial = { status: "idle" as const, message: null };
afterEach(() => vi.clearAllMocks());

test("reset request sends through Supabase and never confirms whether the address exists", async () => {
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({ auth: { resetPasswordForEmail } });
  mocks.headers.mockResolvedValue(new Headers({ origin: "https://example.test" }));
  const form = new FormData();
  form.set("email", "person@example.test");
  const result = await requestPasswordResetAction(initial, form);
  expect(resetPasswordForEmail).toHaveBeenCalledWith("person@example.test", {
    redirectTo: "https://example.test/auth/confirm?flow=recovery",
  });
  expect(result.status).toBe("sent");
  expect(result.message).toMatch(/If a Zero Loss account/);
});

test("Vercel preview emails use the allowed branch URL instead of an immutable deployment", async () => {
  const previousEnvironment = process.env.VERCEL_ENV;
  const previousBranch = process.env.VERCEL_BRANCH_URL;
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_BRANCH_URL = "zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app";
  try {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({ auth: { resetPasswordForEmail } });
    mocks.headers.mockResolvedValue(new Headers({ origin: "https://zero-loss-b4nk1lp92-zero-loss.vercel.app" }));
    const form = new FormData();
    form.set("email", "person@example.test");
    await requestPasswordResetAction(initial, form);
    expect(resetPasswordForEmail).toHaveBeenCalledWith("person@example.test", {
      redirectTo: "https://zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app/auth/confirm?flow=recovery",
    });
  } finally {
    if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousEnvironment;
    if (previousBranch === undefined) delete process.env.VERCEL_BRANCH_URL;
    else process.env.VERCEL_BRANCH_URL = previousBranch;
  }
});

test("new password requires a recovery session and matching passwords", async () => {
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mocks.createClient.mockResolvedValue({ auth: { getUser, updateUser, signOut } });
  const form = new FormData();
  form.set("password", "new-password-123");
  form.set("confirm_password", "new-password-123");
  expect((await updateRecoveredPasswordAction(initial, form)).status).toBe("updated");
  expect(updateUser).toHaveBeenCalledWith({ password: "new-password-123" });
  expect(signOut).toHaveBeenCalledOnce();
});

test("account password change verifies the current password before updating", async () => {
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "person@example.test" } }, error: null });
  const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  mocks.createClient.mockResolvedValue({ auth: { getUser, signInWithPassword, updateUser } });
  const form = new FormData();
  form.set("current_password", "old-password-123");
  form.set("password", "new-password-123");
  form.set("confirm_password", "new-password-123");

  const result = await changeAccountPasswordAction(initial, form);
  expect(result.status).toBe("updated");
  expect(signInWithPassword).toHaveBeenCalledWith({ email: "person@example.test", password: "old-password-123" });
  expect(updateUser).toHaveBeenCalledWith({ password: "new-password-123", current_password: "old-password-123" });
});

test("account password change rejects a wrong current password without updating", async () => {
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "person@example.test" } }, error: null });
  const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("bad password") });
  const updateUser = vi.fn();
  mocks.createClient.mockResolvedValue({ auth: { getUser, signInWithPassword, updateUser } });
  const form = new FormData();
  form.set("current_password", "wrong-password");
  form.set("password", "new-password-123");
  form.set("confirm_password", "new-password-123");

  const result = await changeAccountPasswordAction(initial, form);
  expect(result.status).toBe("error");
  expect(updateUser).not.toHaveBeenCalled();
});
