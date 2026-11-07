import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ reset: vi.fn(), update: vi.fn(), signOut: vi.fn(), verify: vi.fn(), exchange: vi.fn(), redirect: vi.fn(), getUser: vi.fn(), signIn: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "https://example.test" }) }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { resetPasswordForEmail: m.reset, updateUser: m.update, signOut: m.signOut, getUser: m.getUser, signInWithPassword: m.signIn } }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { verifyOtp: m.verify, exchangeCodeForSession: m.exchange } }) }));
import { requestPasswordResetAction, updateRecoveredPasswordAction, signInAction } from "./actions";
import { GET, POST } from "@/app/auth/confirm/route";
import RecoveryPage from "@/app/auth/recovery/page";
import ResetPasswordPage from "@/app/reset-password/page";
import ForgotPasswordPage from "@/app/forgot-password/page";
import { LoginForm } from "@/components/auth/LoginForm";

const initial = { status: "idle" as const, message: null };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  m.reset.mockResolvedValue({ error: null }); m.update.mockResolvedValue({ error: null }); m.signOut.mockResolvedValue({ error: null });
  m.getUser.mockResolvedValue({ data: { user: { id: "fixture-user", email_confirmed_at: "2026-01-01" } }, error: null });
  m.signIn.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null });
  m.verify.mockResolvedValue({ data: { session: { access_token: "mock-session" } }, error: null });
  m.exchange.mockResolvedValue({ data: { session: { access_token: "mock-session" }, redirectType: "recovery" }, error: null });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const destinations = [
  "/account/orders?order=ord_example#order-ord_example",
  "/account/entries/ent_11111111111111111111111111111111?quantity=7&review=entry#add-entries-title",
];
test.each(destinations.flatMap(destination => (["token", "code"] as const).map(kind => [destination, kind] as const)))("recovery carries %s through every %s handoff and sign-in", async (destination, kind) => {
  render(await ForgotPasswordPage({ searchParams: Promise.resolve({ next: destination }) }));
  const request = new FormData(screen.getByRole("button", { name: "Send reset email" }).closest("form")!);
  request.set("email", "person@example.test");
  expect(await requestPasswordResetAction(initial, request)).toMatchObject({ status: "sent" });
  cleanup();
  const callback = new URL(m.reset.mock.calls[0][1].redirectTo);
  expect(callback.searchParams.get("next")).toBe(destination);
  if (kind === "token") { callback.searchParams.set("token_hash", "fake-fixture-token"); callback.searchParams.set("type", "recovery"); }
  else callback.searchParams.set("code", "fake-fixture-code");
  const landingResponse = await GET(new NextRequest(callback));
  expect(m.verify).not.toHaveBeenCalled();
  expect(m.exchange).not.toHaveBeenCalled();
  const landing = new URL(landingResponse.headers.get("location")!);
  render(await RecoveryPage({ searchParams: Promise.resolve(Object.fromEntries(landing.searchParams)) }));
  const confirmation = new FormData(screen.getByRole("button", { name: "Continue to new password" }).closest("form")!);
  expect(confirmation.get("next")).toBe(destination);
  cleanup();
  const confirmed = await POST(new NextRequest(`${callback.origin}/auth/confirm`, { method: "POST", headers: { origin: callback.origin }, body: confirmation }));
  const passwordPage = new URL(confirmed.headers.get("location")!);
  expect(passwordPage.pathname).toBe("/reset-password");
  render(await ResetPasswordPage({ searchParams: Promise.resolve(Object.fromEntries(passwordPage.searchParams)) }));
  const update = new FormData(screen.getByRole("button", { name: "Save new password" }).closest("form")!);
  expect(update.get("next")).toBe(destination);
  // Auth is mocked: no email, password, or session is changed in these tests.
  update.set("password", "fictional-password-123"); update.set("confirm_password", "fictional-password-123");
  await updateRecoveredPasswordAction(initial, update);
  const successPage = new URL(m.redirect.mock.calls.at(-1)![0], callback.origin);
  cleanup();
  render(await ResetPasswordPage({ searchParams: Promise.resolve(Object.fromEntries(successPage.searchParams)) }));
  const signIn = new URL(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")!, callback.origin);
  expect(signIn.searchParams.get("next")).toBe(destination);
  cleanup();
  render(<LoginForm returnTo={signIn.searchParams.get("next")} />);
  const login = new FormData(screen.getByRole("button", { name: "Sign in" }).closest("form")!);
  login.set("email", "person@example.test"); login.set("password", "fictional-password-123");
  await signInAction({ ok: false, message: null }, login);
  expect(m.redirect).toHaveBeenLastCalledWith(destination);
});

test.each(["https://outside.example", "//outside.example", "/account/orders?order=one&order=two", "/account/orders?next=https://outside.example"])("unapproved return %s cannot escape through recovery", async destination => {
  const request = new FormData(); request.set("email", "person@example.test"); request.set("next", destination);
  await requestPasswordResetAction(initial, request);
  expect(new URL(m.reset.mock.calls[0][1].redirectTo).searchParams.has("next")).toBe(false);
  const response = await POST(new NextRequest("https://example.test/auth/confirm", { method: "POST", headers: { origin: "https://example.test" }, body: new URLSearchParams({ flow: "recovery", token_hash: "fake-fixture-token", next: destination }) }));
  expect(response.headers.get("location")).toBe("https://example.test/reset-password");
});

test("expired and incomplete recovery links keep an approved destination for retry", async () => {
  const destination = destinations[0];
  m.verify.mockResolvedValue({ data: { session: null }, error: new Error("Expired") });
  const response = await POST(new NextRequest("https://example.test/auth/confirm", { method: "POST", headers: { origin: "https://example.test" }, body: new URLSearchParams({ flow: "recovery", token_hash: "fake-fixture-token", next: destination }) }));
  expect(new URL(response.headers.get("location")!).searchParams.get("next")).toBe(destination);
  render(await RecoveryPage({ searchParams: Promise.resolve({ next: destination }) }));
  const retry = new URL(screen.getByRole("link", { name: "Request a new link" }).getAttribute("href")!, "https://example.test");
  expect(retry.searchParams.get("next")).toBe(destination);
  expect(m.update).not.toHaveBeenCalled();
});

test("cross-origin recovery confirmation cannot consume a token", async () => {
  const response = await POST(new NextRequest("https://example.test/auth/confirm", { method: "POST", headers: { origin: "https://outside.example" }, body: new URLSearchParams({ flow: "recovery", token_hash: "fake-fixture-token", next: destinations[0] }) }));
  expect(new URL(response.headers.get("location")!).pathname).toBe("/forgot-password");
  expect(m.verify).not.toHaveBeenCalled();
});
