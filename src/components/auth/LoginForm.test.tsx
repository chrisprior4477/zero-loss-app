import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { LoginForm } from "./LoginForm";
import ForgotPasswordPage from "@/app/forgot-password/page";

vi.mock("@/lib/auth/actions", () => ({ signInAction: vi.fn(), requestPasswordResetAction: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("ordinary mobile sign-in links land the form just below the sticky header", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callback(0); return 1; });
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const top = this.id === "login-form" ? 600 : 0;
    const height = this.tagName === "HEADER" ? 163 : 0;
    return { top, height, left: 0, right: 0, bottom: top + height, width: 0, x: 0, y: top, toJSON: () => ({}) };
  });

  render(<><header className="sticky" /><section id="login-form"><LoginForm /></section></>);

  expect(scrollTo).toHaveBeenCalledWith({ top: 429, behavior: "auto" });
});

test("ordinary desktop sign-in leaves the introductory layout in place", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  render(<section id="login-form"><LoginForm /></section>);
  expect(scrollTo).not.toHaveBeenCalled();
});

test("the password detour carries the selected prize and quantity back into the sign-in form", async () => {
  const destination = "/items/playstation-5-slim?quantity=4#enter-entry";
  const base = "https://example.test";
  render(<LoginForm returnTo={destination} />);
  const forgot = new URL(screen.getByRole("link", { name: "Forgot your password?" }).getAttribute("href")!, base);
  expect(forgot.pathname).toBe("/forgot-password");
  cleanup();

  render(await ForgotPasswordPage({ searchParams: Promise.resolve(Object.fromEntries(forgot.searchParams)) }));
  const back = new URL(screen.getByRole("link", { name: /Back to sign in/ }).getAttribute("href")!, base);
  expect(back.pathname).toBe("/login");
  expect(back.searchParams.get("next")).toBe(destination);
  cleanup();

  render(<LoginForm returnTo={back.searchParams.get("next")} />);
  const form = screen.getByRole("button", { name: "Sign in" }).closest("form")!;
  expect(new FormData(form).get("returnTo")).toBe(destination);
});

test.each([undefined, "https://outside.example", ["one", "two"]])("password help falls back to ordinary sign-in for a missing or invalid destination", async next => {
  render(await ForgotPasswordPage({ searchParams: Promise.resolve({ next }) }));
  expect(screen.getByRole("link", { name: /Back to sign in/ }).getAttribute("href")).toBe("/login");
});
