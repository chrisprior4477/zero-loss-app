import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({ preview: vi.fn(), clear: vi.fn() }));
vi.mock("@/lib/account/demo-entry-reset-actions", () => ({
  previewDemoEntryReset: actions.preview,
  clearOwnDemoEntries: actions.clear,
}));

import { ClearAllEntriesButton } from "./ClearAllEntriesButton";

afterEach(() => { cleanup(); actions.preview.mockReset(); actions.clear.mockReset(); });

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
