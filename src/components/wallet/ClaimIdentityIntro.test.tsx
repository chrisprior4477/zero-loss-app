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

  expect(screen.getByRole("dialog", { name: "Before you claim your reward" }).hasAttribute("open")).toBe(true);
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

test("the MVP shortcut replaces Not now and stays disabled while saving", () => {
  const onSkipDemo = vi.fn();
  const props = { onContinue: vi.fn(), onClose: vi.fn(), onSkipDemo };
  const { rerender } = render(<ClaimIdentityIntro {...props} />);
  expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Skip check & claim demo reward" }));
  expect(onSkipDemo).toHaveBeenCalledOnce();
  rerender(<ClaimIdentityIntro {...props} busy />);
  expect((screen.getByRole("button", { name: "Opening your demo reward…" }) as HTMLButtonElement).disabled).toBe(true);
});
