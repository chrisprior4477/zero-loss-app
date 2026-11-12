import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account/lifecycle-actions", () => ({ setPurchaseOptionEmailPreference: save }));
vi.mock("@/lib/account/read-saved-email-preference", () => ({
  readSavedEmailPreference: async () => save.mock.lastCall?.[1]?.get("enabled") === "true",
}));
import { PurchaseOptionEmailPreference } from "./PurchaseOptionEmailPreference";

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

test.each([false, true])("saving a change from %s keeps the checkbox consistent with the submitted choice", async initial => {
  const enabled = !initial;
  const message = enabled ? "Purchase-option email reminders are on." : "Purchase-option email reminders are off.";
  save.mockResolvedValue({ status: "succeeded", message });
  render(<PurchaseOptionEmailPreference initialEnabled={initial} />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save preference" }));
  expect(await screen.findByRole("status")).toHaveProperty("textContent", message);
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", enabled);
  expect(save.mock.calls[0][1].get("enabled")).toBe(enabled ? "true" : null);
});

test.each([false, true])("a dropped response keeps the choice from %s editable for retry", async initial => {
  save.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce({ status: "succeeded", message: "Reminder preference saved." });
  render(<PurchaseOptionEmailPreference initialEnabled={initial} />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save preference" }));
  expect(await screen.findByRole("status")).toHaveProperty("textContent", expect.stringContaining("Your choice is still here"));
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", !initial);
  expect(screen.getByRole("button", { name: "Save preference" })).toHaveProperty("disabled", false);
  fireEvent.click(screen.getByRole("button", { name: "Save preference" }));
  expect(await screen.findByText("Reminder preference saved.")).toBeTruthy();
  expect(save.mock.calls[1][1].get("enabled")).toBe(initial ? null : "true");
});

test("server rejection is shown inline and changing the draft clears outdated feedback", async () => {
  save.mockResolvedValue({ status: "error", message: "Sign in again before changing reminders." });
  render(<PurchaseOptionEmailPreference initialEnabled={false} />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save preference" }));
  expect(await screen.findByRole("status")).toHaveProperty("textContent", "Sign in again before changing reminders.");
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.queryByRole("status")).toBeNull();
});

test("save stays pending until the response and does not reset the choice", async () => {
  let finish!: (result: unknown) => void;
  save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<PurchaseOptionEmailPreference initialEnabled={false} />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save preference" }));
  expect(await screen.findByRole("button", { name: "Saving…" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("checkbox")).toHaveProperty("disabled", true);
  await act(async () => finish({ status: "succeeded", message: "Saved on" }));
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
});

test("unavailable preferences cannot be submitted", () => {
  render(<PurchaseOptionEmailPreference initialEnabled={null} />);
  expect(screen.getByRole("checkbox")).toHaveProperty("disabled", true);
  fireEvent.submit(screen.getByRole("button", { name: "Save preference" }).closest("form")!);
  expect(save).not.toHaveBeenCalled();
});
