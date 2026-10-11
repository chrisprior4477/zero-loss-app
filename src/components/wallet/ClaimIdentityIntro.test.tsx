import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClaimIdentityIntro } from "./ClaimIdentityIntro";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(cleanup);

test("first-win explanation stays open until the customer chooses what to do", () => {
  const onContinue = vi.fn();
  const onClose = vi.fn();
  render(<ClaimIdentityIntro onContinue={onContinue} onClose={onClose} />);

  expect(screen.getByRole("dialog", { name: "Before you claim your first win" }).hasAttribute("open")).toBe(true);
  expect(screen.getByText(/fictional sample details/)).toBeTruthy();
  expect(screen.getByText(/Return here to claim your reward/)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Continue to identity check" }));
  expect(onContinue).toHaveBeenCalledOnce();
  expect(onClose).not.toHaveBeenCalled();
});

test("the customer can defer without entering the sample check", () => {
  const onContinue = vi.fn();
  const onClose = vi.fn();
  render(<ClaimIdentityIntro onContinue={onContinue} onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: "Not now" }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onContinue).not.toHaveBeenCalled();
});
