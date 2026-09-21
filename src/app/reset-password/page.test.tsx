import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/components/auth/ResetPasswordForm", () => ({ ResetPasswordForm: () => <div>Reset form</div> }));

import ResetPasswordPage from "./page";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("success stays visible without a session, including after a refresh", async () => {
  render(await ResetPasswordPage({ searchParams: Promise.resolve({ updated: "1" }) }));
  expect(screen.getByRole("heading", { name: "Password updated" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Your password has been changed");
  expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toContain("/login");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(createClient).not.toHaveBeenCalled();
});

test("no session offers sign-in and recovery without claiming the password was unchanged", async () => {
  createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } });
  render(await ResetPasswordPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("alert").textContent).not.toContain("has not changed");
  expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Request a new reset link" })).toBeTruthy();
});

test("valid session still shows the password form", async () => {
  createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) } });
  render(await ResetPasswordPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText("Reset form")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
});
