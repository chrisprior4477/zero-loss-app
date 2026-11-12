import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account/entry-outcome-email-actions", () => ({ saveEntryOutcomeEmailPreference: save }));
vi.mock("@/lib/account/read-saved-email-preference", () => ({
  readSavedEmailPreference: async () => save.mock.lastCall?.[1]?.get("enabled") === "true",
}));
import { EntryOutcomeEmailPreference } from "./EntryOutcomeEmailPreference";
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

test.each(["entry", "account", "entry-page"] as const)("%s preserves the selected email choice after a transport failure and supports retry", async placement => {
  save.mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce({ status: "succeeded", message: "Email preference saved." });
  render(<EntryOutcomeEmailPreference initialEnabled={false} placement={placement} />);
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
  fireEvent.submit(screen.getByRole("button", { name: "Save preference" }).closest("form")!);
  expect(await screen.findByRole("status")).toHaveProperty("textContent", expect.stringContaining("Your choice is still here"));
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
  expect(screen.getByRole("button", { name: "Save preference" })).toHaveProperty("disabled", false);
  fireEvent.submit(screen.getByRole("button", { name: "Save preference" }).closest("form")!);
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Email preference saved."));
  expect(save.mock.calls[1][1].get("enabled")).toBe("true");
});

test("an unavailable preference cannot be submitted", () => {
  render(<EntryOutcomeEmailPreference initialEnabled={null} />);
  expect(screen.getByRole("checkbox")).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: "Save preference" })).toHaveProperty("disabled", true);
  expect(save).not.toHaveBeenCalled();
});

test("turning emails off also survives a failed save and retries as off", async () => {
  save.mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce({ status: "succeeded", message: "Saved off" });
  render(<EntryOutcomeEmailPreference initialEnabled />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.submit(screen.getByRole("button", { name: "Save preference" }).closest("form")!);
  await screen.findByRole("status");
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", false);
  fireEvent.submit(screen.getByRole("button", { name: "Save preference" }).closest("form")!);
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved off"));
  expect(save.mock.calls[1][1].get("enabled")).toBeNull();
});

test("the save remains pending until its response, then displays normal server errors inline", async () => {
  let finish!: (value: unknown) => void;
  save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<EntryOutcomeEmailPreference initialEnabled={true} />);
  fireEvent.submit(screen.getByRole("button", { name: "Save preference" }).closest("form")!);
  expect(await screen.findByRole("button", { name: "Saving…" })).toHaveProperty("disabled", true);
  await act(async () => finish({ status: "error", message: "Sign in again before saving this choice." }));
  expect(screen.getByRole("status").textContent).toBe("Sign in again before saving this choice.");
  expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);
});
