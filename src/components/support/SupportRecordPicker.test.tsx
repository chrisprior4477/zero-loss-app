import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SupportRecordPicker } from "./SupportRecordPicker";
import { loadSupportRecords } from "@/lib/support/record-actions";

vi.mock("@/lib/support/record-actions", () => ({
  loadSupportRecords: vi.fn(async () => ({ records: [], more: false })),
}));

afterEach(() => {
  window.history.replaceState(null, "");
  cleanup();
  vi.restoreAllMocks();
});

function mockNativeDialog() {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}

test("Back dismisses the attachment picker and preserves the unfinished report", async () => {
  window.history.replaceState(null, "", "/support#report-problem");
  mockNativeDialog();
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

test("Forward restores the browsed record page even when the attachment is on an earlier page", async () => {
  window.history.replaceState(null, "", "/support#report-problem");
  mockNativeDialog();
  const first = { id: "first", kind: "transaction" as const, title: "Current payment", detail: "Payment", date: "2026-11-21T17:00:00Z", status: "Posted", amount: -100 };
  const second = { ...first, id: "second", title: "Earlier payment" };
  const load = vi.mocked(loadSupportRecords);
  load.mockImplementation(async (_kind, page, selected) => selected || page === 0
    ? { records: [first], page: 0, more: true } : { records: [second], page: 1, more: false });
  try {
    render(<SupportRecordPicker record={first} onChange={vi.fn()} timeZone="America/New_York" disabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    const earlier = await screen.findByRole("button", { name: /Earlier payment/ });
    earlier.focus();
    const openHistory = window.history.state;
    act(() => {
      window.history.replaceState(null, "");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    act(() => {
      window.history.replaceState(openHistory, "");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    const restored = await screen.findByRole("button", { name: /Earlier payment/ });
    expect(document.activeElement).toBe(restored);
    expect(screen.getByText("Current attachment")).toBeTruthy();
  } finally { load.mockImplementation(async () => ({ records: [], more: false })); }
});
