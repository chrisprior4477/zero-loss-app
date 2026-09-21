import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), redirect: vi.fn() }));
vi.mock("@/lib/auth/actions", () => ({ signInAction: vi.fn(), signUpAction: vi.fn(), resendVerificationAction: vi.fn() }));
import LoginPage from "@/app/login/page";
import SignUpPage from "@/app/signup/page";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test.each(["/items/playstation-5-slim#enter-entry", "/account/wallet?view=history&from=samsung-m70h-tv#add-funds", "https://evil.test"])("both signup links, the signup forms and return-to-login keep only approved destinations: %s", async next => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  const allowed = next.startsWith("/");
  render(await LoginPage({ searchParams: Promise.resolve({ next }) }));
  const signupHref = allowed ? `/signup?next=${encodeURIComponent(next)}` : "/signup";
  expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toBe(signupHref);
  expect(screen.getByRole("link", { name: "Sign up", exact: true }).getAttribute("href")).toBe(signupHref);
  cleanup();
  render(await SignUpPage({ searchParams: Promise.resolve({ next }) }));
  expect(screen.getByRole("link", { name: "Sign in instead" }).getAttribute("href")).toBe(allowed ? `/login?next=${encodeURIComponent(next)}` : "/login");
  const hidden = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="returnTo"]'));
  expect(hidden).toHaveLength(allowed ? 2 : 0);
  hidden.forEach(input => expect(input.value).toBe(next));
});
