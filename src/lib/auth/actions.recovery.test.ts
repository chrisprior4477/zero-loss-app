import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { changeAccountPasswordAction, requestPasswordResetAction, signOutEverywhereAction, updateRecoveredPasswordAction } from "./actions";

const initial = { status: "idle" as const, message: null };
afterEach(() => vi.clearAllMocks());

test("sign out everywhere requires a session and explicitly revokes every refresh session", async () => {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const getUser = vi.fn().mockResolvedValueOnce({ data: { user: null }, error: null }).mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });
  mocks.createClient.mockResolvedValue({ auth: { getUser, signOut } });
  const form = new FormData();
  const expired = await signOutEverywhereAction({ status: "idle", message: null }, form);
  expect(expired.status).toBe("error");
  expect(signOut).not.toHaveBeenCalled();
  await signOutEverywhereAction({ status: "idle", message: null }, form);
  expect(signOut).toHaveBeenCalledWith({ scope: "global" });
  expect(mocks.redirect).toHaveBeenCalledWith("/login");
});

test("failed global sign out reports failure without claiming the account signed out", async () => {
  const signOut = vi.fn().mockResolvedValue({ error: new Error("network") });
  mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }), signOut } });
  const result = await signOutEverywhereAction({ status: "idle", message: null }, new FormData());
  expect(result.status).toBe("error");
  expect(mocks.redirect).not.toHaveBeenCalled();
});

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

test("password recovery started on the branded MVP returns there", async () => {
  const previousEnvironment = process.env.VERCEL_ENV;
  const previousBranch = process.env.VERCEL_BRANCH_URL;
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_BRANCH_URL = "zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app";
  try {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({ auth: { resetPasswordForEmail } });
    mocks.headers.mockResolvedValue(new Headers({ origin: "https://mvp.getzeroloss.com" }));
    const form = new FormData();
    form.set("email", "person@example.test");
    await requestPasswordResetAction(initial, form);
    expect(resetPasswordForEmail).toHaveBeenCalledWith("person@example.test", {
      redirectTo: "https://mvp.getzeroloss.com/auth/confirm?flow=recovery",
    });
  } finally {
    if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousEnvironment;
    if (previousBranch === undefined) delete process.env.VERCEL_BRANCH_URL;
    else process.env.VERCEL_BRANCH_URL = previousBranch;
  }
});

test("successful recovery redirects to a success view that survives signing out", async () => {
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mocks.createClient.mockResolvedValue({ auth: { getUser, updateUser, signOut } });
  const form = new FormData();
  form.set("password", "new-password-123");
  form.set("confirm_password", "new-password-123");
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(updateRecoveredPasswordAction(initial, form)).rejects.toThrow("NEXT_REDIRECT");
  expect(updateUser).toHaveBeenCalledWith({ password: "new-password-123" });
  expect(signOut).toHaveBeenCalledOnce();
  expect(mocks.redirect).toHaveBeenCalledWith("/reset-password?updated=1");
  expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]);
});

test("reusing the saved password explains what happened and preserves the reset session", async () => {
  const updateUser = vi.fn().mockResolvedValue({ error: { code: "same_password", status: 422 } });
  const signOut = vi.fn();
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mocks.createClient.mockResolvedValue({ auth: { getUser, updateUser, signOut } });
  const form = new FormData();
  form.set("password", "already-saved-123");
  form.set("confirm_password", "already-saved-123");
  const result = await updateRecoveredPasswordAction(initial, form);
  expect(result.status).toBe("error");
  expect(result.message).toContain("already your current password");
  expect(signOut).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});

test("missing session never attempts a password update or reports success", async () => {
  const updateUser = vi.fn();
  const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { code: "session_not_found" } });
  mocks.createClient.mockResolvedValue({ auth: { getUser, updateUser } });
  const form = new FormData();
  form.set("password", "new-password-123");
  form.set("confirm_password", "new-password-123");
  const result = await updateRecoveredPasswordAction(initial, form);
  expect(result.status).toBe("error");
  expect(updateUser).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});

test.each([
  ["short", "short", "at least"],
  ["new-password-123", "different-password", "don't match"],
])("invalid recovery input is rejected before connecting to Auth: %s", async (password, confirmation, message) => {
  const form = new FormData();
  form.set("password", password);
  form.set("confirm_password", confirmation);
  expect((await updateRecoveredPasswordAction(initial, form)).message).toContain(message);
  expect(mocks.createClient).not.toHaveBeenCalled();
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
