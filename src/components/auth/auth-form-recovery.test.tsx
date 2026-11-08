import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { redirect } from "next/navigation";
import { ChangePasswordControl } from "@/components/account/ChangePasswordControl";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { recoverAuthForm } from "./recover-auth-form";

const m = vi.hoisted(() => ({
  signInAction: vi.fn(), signUpAction: vi.fn(), updateRecoveredPasswordAction: vi.fn(),
  changeAccountPasswordAction: vi.fn(), resendVerificationAction: vi.fn(),
}));
vi.mock("@/lib/auth/actions", () => m);
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const destination = "/account/orders?order=ord_123";

test.each([
  { label: "Sign in", submit: m.signInAction, view: <LoginForm returnTo={destination} />, hidden: "returnTo" },
  { label: "Create account", submit: m.signUpAction, view: <SignUpForm returnTo={destination} />, hidden: "returnTo" },
  { label: "Save new password", submit: m.updateRecoveredPasswordAction, view: <ResetPasswordForm returnTo={destination} />, hidden: "next" },
  { label: "Save new password", submit: m.changeAccountPasswordAction, view: <ChangePasswordControl />, hidden: null },
])("a lost $label response keeps the form available without replaying the request", async ({ label, submit, view, hidden }) => {
  submit.mockRejectedValueOnce(new Error("offline"));
  render(view);
  if (!hidden) fireEvent.click(screen.getByRole("button", { name: "Change password" }));
  const form = screen.getByRole("button", { name: label }).closest("form")!;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  if (input("email")) fireEvent.change(input("email")!, { target: { value: "person@example.test" } });
  if (input("legal_first_name")) fireEvent.change(input("legal_first_name")!, { target: { value: "Sample" } });
  for (const field of form.querySelectorAll('input[type="password"]')) {
    fireEvent.change(field, { target: { value: "fictional-password-123" } });
  }
  fireEvent.submit(form);
  expect((await screen.findByRole("alert")).textContent).toContain("couldn’t confirm");
  const retry = screen.getByRole("button", { name: label }) as HTMLButtonElement;
  expect(retry.disabled).toBe(false);
  const data = new FormData(retry.form!);
  if (hidden) expect(data.get(hidden)).toBe(destination);
  if (data.has("email")) expect(data.get("email")).toBe("person@example.test");
  if (data.has("legal_first_name")) expect(data.get("legal_first_name")).toBe("Sample");
  for (const field of retry.form!.querySelectorAll<HTMLInputElement>('input[type="password"]')) expect(field.value).toBe("");
  expect(submit).toHaveBeenCalledOnce();
  expect(m.resendVerificationAction).not.toHaveBeenCalled();
});

test("a successful redirect still propagates through auth form recovery", async () => {
  const interrupted = vi.fn();
  const action = recoverAuthForm(async () => redirect(destination), interrupted);
  await expect(action(undefined, new FormData())).rejects.toThrow("NEXT_REDIRECT");
  expect(interrupted).not.toHaveBeenCalled();
});
