import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SupportRecordPicker } from "./SupportRecordPicker";

vi.mock("@/lib/support/record-actions", () => ({
  loadSupportRecords: vi.fn(async () => ({ records: [], more: false })),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("Back dismisses the attachment picker and preserves the unfinished report", async () => {
  window.history.replaceState(null, "", "/support#report-problem");
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
  render(<><textarea aria-label="Report" defaultValue="An unfinished report" />
    <SupportRecordPicker onChange={vi.fn()} timeZone="America/New_York" disabled={false} /></>);
  const trigger = screen.getByRole("button", { name: /Attach an order/ });
  fireEvent.click(trigger);
  await screen.findByRole("dialog", { name: "Choose a record" });
  await screen.findByText("No orders on this page.");
  const openHistory = window.history.state;
  expect(Object.keys(openHistory).some(key => key.startsWith("zeroLossDialog-"))).toBe(true);
  act(() => {
    window.history.replaceState(null, "");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("textbox", { name: "Report" })).toHaveProperty("value", "An unfinished report");
  expect(document.activeElement).toBe(trigger);
  act(() => {
    window.history.replaceState(openHistory, "");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await screen.findByRole("dialog", { name: "Choose a record" });
  expect(screen.getByRole("textbox", { name: "Report", hidden: true })).toHaveProperty("value", "An unfinished report");
});

test("immediate Forward reopens the picker before the native close event arrives", async () => {
  window.history.replaceState(null, "", "/support#report-problem");
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (this: HTMLDialogElement) {
    this.open = false;
  });
  render(<SupportRecordPicker onChange={vi.fn()} timeZone="America/New_York" disabled={false} />);
  fireEvent.click(screen.getByRole("button", { name: /Attach an order/ }));
  const dialog = await screen.findByRole("dialog", { name: "Choose a record" });
  fireEvent.click(screen.getByRole("button", { name: "Wallet transactions" }));
  const openHistory = window.history.state;

  act(() => {
    window.history.replaceState(null, "");
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.history.replaceState(openHistory, "");
    window.dispatchEvent(new PopStateEvent("popstate"));
    dialog.dispatchEvent(new Event("close"));
  });

  expect(dialog).toHaveProperty("open", true);
  expect(screen.getByRole("button", { name: "Wallet transactions" }).getAttribute("aria-pressed")).toBe("true");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close record picker" }));
  await screen.findByText("No wallet transactions on this page.");
});
