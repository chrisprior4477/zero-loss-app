import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = vi.fn();
const clearAfterDemoReset = vi.fn();
vi.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ clearAfterDemoReset }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/account/demo-activity-reset-actions", () => ({
  previewAllDemoActivityReset: vi.fn(), resetAllDemoActivity: vi.fn(),
}));
import { previewAllDemoActivityReset, resetAllDemoActivity } from "@/lib/account/demo-activity-reset-actions";
import { ResetAllDemoActivityButton } from "./ResetAllDemoActivityButton";

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.mocked(previewAllDemoActivityReset).mockReset(); vi.mocked(resetAllDemoActivity).mockReset(); });

test("confirmation explains both empty histories and preserves sign-in; cancel makes no change", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(previewAllDemoActivityReset).mockResolvedValue({ status: "ready", entryCount: 3, balanceCents: 2500 });
  render(<ResetAllDemoActivityButton />);
  fireEvent.click(screen.getByRole("button", { name: "Reset All Demo Activity" }));
  await waitFor(() => expect(screen.getByRole("dialog", { name: "Reset all demo activity?" })).toBeTruthy());
  expect(screen.getByText(/transaction and payment-deposit lists will look empty/).textContent).toContain("$25");
  expect(screen.getByText(/Your login, profile and account settings stay/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep my demo activity" }));
  expect(resetAllDemoActivity).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
  expect(clearAfterDemoReset).not.toHaveBeenCalled();
});

test("confirmed reset uses checked counts and refreshes the account", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(previewAllDemoActivityReset).mockResolvedValue({ status: "ready", entryCount: 2, balanceCents: 50000 });
  vi.mocked(resetAllDemoActivity).mockResolvedValue({ status: "succeeded", clearedCount: 2, clearedCents: 50000 });
  render(<ResetAllDemoActivityButton />);
  fireEvent.click(screen.getByRole("button", { name: "Reset All Demo Activity" }));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  fireEvent.click(screen.getByRole("dialog").querySelector("button:last-child")!);
  await waitFor(() => expect(resetAllDemoActivity).toHaveBeenCalledWith(2, 50000, expect.any(String)));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(clearAfterDemoReset).toHaveBeenCalledOnce();
});

test("a refused reset preserves existing notifications", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.mocked(previewAllDemoActivityReset).mockResolvedValue({ status: "ready", entryCount: 2, balanceCents: 50000 });
  vi.mocked(resetAllDemoActivity).mockResolvedValue({ status: "error", message: "Demo entries changed. Review and confirm again." });
  render(<ResetAllDemoActivityButton />);
  fireEvent.click(screen.getByRole("button", { name: "Reset All Demo Activity" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("dialog").querySelector("button:last-child")!);
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Demo entries changed. Review and confirm again.");
  expect(clearAfterDemoReset).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
});

test("a failed preview stays recoverable and never calls reset", async () => {
  vi.mocked(previewAllDemoActivityReset).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ status: "ready", entryCount: 47, balanceCents: 13600 });
  render(<ResetAllDemoActivityButton />);
  fireEvent.click(screen.getByRole("button", { name: "Reset All Demo Activity" }));
  expect((await screen.findByRole("status")).textContent).toContain("No reset was requested");
  expect(resetAllDemoActivity).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Reset All Demo Activity" }));
  expect(await screen.findByRole("dialog")).toBeTruthy();
});

test("a lost reset response checks the account without resetting again or inventing empty notifications", async () => {
  vi.mocked(previewAllDemoActivityReset).mockResolvedValueOnce({ status: "ready", entryCount: 47, balanceCents: 13600 })
    .mockRejectedValueOnce(new Error("Still offline")).mockResolvedValueOnce({ status: "ready", entryCount: 0, balanceCents: 0 });
  vi.mocked(resetAllDemoActivity).mockRejectedValue(new Error("Lost response"));
  render(<ResetAllDemoActivityButton />);
  fireEvent.click(screen.getByRole("button", { name: "Reset All Demo Activity" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("dialog").querySelector("button:last-child")!);
  expect((await screen.findByRole("alert")).textContent).toContain("may already be saved");
  expect(screen.getByRole("dialog").querySelector("button:last-child")?.textContent).toBe("Check demo activity");
  fireEvent.click(await screen.findByRole("button", { name: "Check demo activity" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("still couldn’t check"));
  fireEvent.click(await screen.findByRole("button", { name: "Check demo activity" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("status").textContent).toContain("0 entries and $0");
  expect(resetAllDemoActivity).toHaveBeenCalledOnce();
  expect(resetAllDemoActivity).toHaveBeenCalledWith(47, 13600, expect.stringMatching(/^[a-f0-9-]{36}$/));
  expect(clearAfterDemoReset).not.toHaveBeenCalled();
  expect(refresh).toHaveBeenCalledOnce();
});
