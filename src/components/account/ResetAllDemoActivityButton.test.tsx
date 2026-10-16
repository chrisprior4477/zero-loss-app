import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/account/demo-activity-reset-actions", () => ({
  previewAllDemoActivityReset: vi.fn(), resetAllDemoActivity: vi.fn(),
}));
import { previewAllDemoActivityReset, resetAllDemoActivity } from "@/lib/account/demo-activity-reset-actions";
import { ResetAllDemoActivityButton } from "./ResetAllDemoActivityButton";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

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
});
