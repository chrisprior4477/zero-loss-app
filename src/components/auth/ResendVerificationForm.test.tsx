import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
const resend = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/actions", () => ({ resendVerificationAction: resend }));
import { ResendVerificationForm } from "./ResendVerificationForm";

beforeEach(() => { resend.mockReset(); });
afterEach(cleanup);

test("a dropped resend stays inline and retry preserves the email and return destination", async () => {
  resend.mockRejectedValueOnce(new Error("Connection lost"));
  resend.mockResolvedValueOnce({ ok: true, message: "If verification is pending, a new email is on its way." });
  const destination = "/account/entries/ent_7d47f96535c04356844aee9325b4fd50?quantity=7&review=entry#add-entries-title";
  render(<ResendVerificationForm email="person@example.test" returnTo={destination} />);
  const button = screen.getByRole("button", { name: "Resend verification email" });
  fireEvent.submit(button.closest("form")!);
  expect((await screen.findByRole("alert")).textContent).toContain("Check your connection");
  expect((button as HTMLButtonElement).disabled).toBe(false);
  fireEvent.submit(button.closest("form")!);
  expect((await screen.findByRole("status")).textContent).toContain("a new email is on its way");
  expect(screen.getByRole("complementary", { name: "Email delivery tip" })).toBeTruthy();
  expect(resend).toHaveBeenCalledTimes(2);
  for (const call of resend.mock.calls) {
    expect(call[1].get("verification_email")).toBe("person@example.test");
    expect(call[1].get("returnTo")).toContain("quantity=7");
  }
});

test("a returned server refusal is shown without claiming that an email was sent", async () => {
  resend.mockResolvedValueOnce({ ok: false, message: "Please wait a moment and try again." });
  render(<ResendVerificationForm email="person@example.test" />);
  fireEvent.submit(screen.getByRole("button", { name: "Resend verification email" }).closest("form")!);
  expect((await screen.findByRole("alert")).textContent).toContain("Please wait");
  expect(screen.queryByRole("complementary", { name: "Email delivery tip" })).toBeNull();
});

test("an empty email keeps resend unavailable", () => {
  render(<ResendVerificationForm email=" " />);
  expect(screen.getByRole("button", { name: "Resend verification email" })).toHaveProperty("disabled", true);
  expect(resend).not.toHaveBeenCalled();
});
