import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const requestReset = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/actions", () => ({ requestPasswordResetAction: requestReset }));
import { ForgotPasswordForm } from "./ForgotPasswordForm";
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

test("successful send retains the address so Resend submits it again with the same destination", async () => {
  requestReset.mockResolvedValue({ status: "sent", message: "If an account uses that address, check your inbox." });
  const destination = "/account/orders?order=ord_example#order-ord_example";
  render(<ForgotPasswordForm signInHref="/login" returnTo={destination} />);
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.test" } });
  fireEvent.submit(screen.getByRole("button", { name: "Send reset email" }).closest("form")!);
  await screen.findByRole("button", { name: "Resend reset email" });
  expect(screen.getByLabelText("Email address")).toHaveProperty("value", "person@example.test");
  fireEvent.submit(screen.getByRole("button", { name: "Resend reset email" }).closest("form")!);
  await waitFor(() => expect(requestReset).toHaveBeenCalledTimes(2));
  expect(requestReset.mock.calls[1][1].get("email")).toBe("person@example.test");
  expect(requestReset.mock.calls[1][1].get("next")).toBe(destination);
});

test("a lost reset response keeps the address and offers retry without an error boundary", async () => {
  requestReset.mockRejectedValue(new Error("Connection lost"));
  render(<ForgotPasswordForm signInHref="/login" returnTo="https://outside.example" />);
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.test" } });
  fireEvent.submit(screen.getByRole("button", { name: "Send reset email" }).closest("form")!);
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Your address is still here"));
  expect(screen.getByLabelText("Email address")).toHaveProperty("value", "person@example.test");
  expect(screen.getByRole("button", { name: "Send reset email" })).toHaveProperty("disabled", false);
  expect(requestReset.mock.calls[0][1].get("next")).toBeNull();
});

test("editing the address clears the old sent message until the new address is submitted", async () => {
  requestReset.mockResolvedValue({ status: "sent", message: "Check your inbox." });
  render(<ForgotPasswordForm signInHref="/login" />);
  const email = screen.getByLabelText("Email address");
  const form = screen.getByRole("button", { name: "Send reset email" }).closest("form")!;
  fireEvent.change(email, { target: { value: "first@example.test" } });
  fireEvent.submit(form);
  await screen.findByRole("button", { name: "Resend reset email" });
  fireEvent.change(email, { target: { value: "second@example.test" } });
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("button", { name: "Send reset email" })).toHaveProperty("disabled", false);
  expect(requestReset).toHaveBeenCalledOnce();
  fireEvent.submit(form);
  await screen.findByRole("button", { name: "Resend reset email" });
  expect(requestReset.mock.calls[1][1].get("email")).toBe("second@example.test");
});

test.each(["sent", "error"])("a late %s reply for the previous address cannot label the edited address", async status => {
  let finish!: (result: { status: string; message: string }) => void;
  requestReset.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  render(<ForgotPasswordForm signInHref="/login" />);
  const email = screen.getByLabelText("Email address");
  fireEvent.change(email, { target: { value: "first@example.test" } });
  fireEvent.submit(screen.getByRole("button", { name: "Send reset email" }).closest("form")!);
  fireEvent.change(email, { target: { value: "second@example.test" } });
  await act(async () => finish({ status, message: "Reply to the first request" }));
  expect(screen.queryByText("Reply to the first request")).toBeNull();
  expect(screen.getByRole("button", { name: "Send reset email" })).toHaveProperty("disabled", false);
  expect(requestReset).toHaveBeenCalledOnce();
});
