import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/lib/account/lifecycle-actions", () => ({ setDeclinedOfferEmailReminder: mocks.save }));
import { DeclinedOfferDeadline } from "./DeclinedOfferDeadline";

const optionId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date("2026-10-09T12:00:00Z")); mocks.save.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

test("shows whole days left and saves an explicit two-day email opt-in", async () => {
  mocks.save.mockResolvedValue({ status: "pending", message: "Two-day email reminder saved." });
  render(<DeclinedOfferDeadline optionId={optionId} expiresAt="2026-11-08T12:00:00Z" initialReminderStatus={null} canRequestReminder />);
  expect(await screen.findByText("29 days left")).toBeTruthy();
  const checkbox = screen.getByRole("checkbox", { name: /Please remind me by email two days before/ }) as HTMLInputElement;
  expect(checkbox.disabled).toBe(false);
  fireEvent.click(checkbox);
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(optionId, true));
  await waitFor(() => expect(checkbox.checked).toBe(true));
  expect(screen.getByRole("status").textContent).toContain("saved");
});

test("too-late and already-sent reminders cannot be scheduled again", async () => {
  const view = render(<DeclinedOfferDeadline optionId={optionId} expiresAt="2026-10-10T12:00:00Z" initialReminderStatus={null} canRequestReminder />);
  const checkbox = await screen.findByRole("checkbox");
  await waitFor(() => expect((checkbox as HTMLInputElement).disabled).toBe(true));
  expect(screen.getByText(/Too close to the deadline/)).toBeTruthy();
  view.unmount();
  render(<DeclinedOfferDeadline optionId={optionId} expiresAt="2026-11-08T12:00:00Z" initialReminderStatus="sent" canRequestReminder />);
  expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
  expect(mocks.save).not.toHaveBeenCalled();
});
