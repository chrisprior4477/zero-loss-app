import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({ preview: vi.fn(), clear: vi.fn(), check: vi.fn() }));
const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/account/demo-entry-reset-actions", () => ({
  previewDemoEntryReset: actions.preview,
  clearOwnDemoEntries: actions.clear,
  checkDemoEntryReset: actions.check,
}));

import { ClearAllEntriesButton } from "./ClearAllEntriesButton";

afterEach(() => { cleanup(); actions.preview.mockReset(); actions.clear.mockReset(); actions.check.mockReset(); navigation.refresh.mockReset(); });

test("confirms scope and preserves data on cancellation", async () => {
  actions.preview.mockResolvedValue({ status: "ready", entryCount: 7 });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  render(<ClearAllEntriesButton />);
  fireEvent.click(screen.getByRole("button", { name: "Clear All Entries" }));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  expect(screen.getByText(/Only this account is affected/).textContent).toContain("does not refund an entry");
  fireEvent.click(screen.getByRole("button", { name: "Keep entries" }));
  expect(actions.clear).not.toHaveBeenCalled();
});

test("no current entries does not issue a reset", async () => {
  actions.preview.mockResolvedValue({ status: "ready", entryCount: 0 });
  render(<ClearAllEntriesButton />);
  fireEvent.click(screen.getByRole("button", { name: "Clear All Entries" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("no current demo entries"));
  expect(actions.clear).not.toHaveBeenCalled();
});

test("confirmation sends the displayed count and a single request key", async () => {
  actions.preview.mockResolvedValue({ status: "ready", entryCount: 2 });
  actions.clear.mockResolvedValue({ status: "succeeded", clearedCount: 2 });
  render(<ClearAllEntriesButton />);
  fireEvent.click(screen.getByRole("button", { name: "Clear All Entries" }));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Clear demo entries" }));
  await waitFor(() => expect(actions.clear).toHaveBeenCalledOnce());
  expect(actions.clear.mock.calls[0][0]).toBe(2);
  expect(actions.clear.mock.calls[0][1]).toMatch(/^[0-9a-f-]{36}$/);
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("2 demo entries cleared"));
});

test("a failed entry check offers a retry without requesting a reset", async () => {
  actions.preview.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ status: "ready", entryCount: 47 });
  render(<ClearAllEntriesButton />);
  fireEvent.click(screen.getByRole("button", { name: "Clear All Entries" }));
  expect((await screen.findByRole("status")).textContent).toContain("No reset was requested");
  expect(actions.clear).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Clear All Entries" }));
  expect(await screen.findByRole("dialog")).toBeTruthy();
});

test("a lost clear response checks the exact receipt and current count without a second reset", async () => {
  actions.preview.mockResolvedValueOnce({ status: "ready", entryCount: 47 });
  actions.check.mockRejectedValueOnce(new Error("Still offline")).mockResolvedValueOnce({ status: "checked", clearedCount: 47, currentCount: 1 });
  actions.clear.mockRejectedValue(new Error("Missing confirmation"));
  render(<ClearAllEntriesButton />);
  fireEvent.click(screen.getByRole("button", { name: "Clear All Entries" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Clear demo entries" }));
  expect((await screen.findByRole("alert")).textContent).toContain("may already have been cleared");
  expect(screen.queryByRole("button", { name: "Clear demo entries" })).toBeNull();
  fireEvent.click(await screen.findByRole("button", { name: "Check entry status" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("still couldn’t check"));
  fireEvent.click(await screen.findByRole("button", { name: "Check entry status" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("status").textContent).toContain("This reset cleared 47 demo entries. Your account currently has 1 demo entry.");
  expect(actions.check).toHaveBeenCalledWith(actions.clear.mock.calls[0][1]);
  expect(actions.clear).toHaveBeenCalledOnce();
  expect(navigation.refresh).toHaveBeenCalledOnce();
});
