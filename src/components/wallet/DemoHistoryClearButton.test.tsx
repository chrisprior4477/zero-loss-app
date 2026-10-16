import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/wallet/demo-history-actions", () => ({
  previewDemoHistoryClear: vi.fn(), clearDemoWalletHistory: vi.fn(),
}));
import { clearDemoWalletHistory, previewDemoHistoryClear } from "@/lib/wallet/demo-history-actions";
import { DemoHistoryClearButton } from "./DemoHistoryClearButton";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("clearing deposits requires a second confirmation and refreshes only after success", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(previewDemoHistoryClear).mockResolvedValue({ status: "ready", balanceCents: 2500 });
  vi.mocked(clearDemoWalletHistory).mockResolvedValue({ status: "succeeded", hiddenCount: 2, clearedCents: 2500 });
  render(<DemoHistoryClearButton kind="deposits" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete All Demo Deposits" }));
  await waitFor(() => expect(screen.getByRole("dialog", { name: "Delete All Demo Deposits?" })).toBeTruthy());
  expect(screen.getByText(/resets your current/).textContent).toContain("$25");
  expect(clearDemoWalletHistory).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(clearDemoWalletHistory).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete All Demo Deposits" }));
  await waitFor(() => expect(screen.getByRole("dialog", { name: "Delete All Demo Deposits?" })).toBeTruthy());
  fireEvent.click(screen.getByRole("dialog").querySelector("button:last-child")!);
  await waitFor(() => expect(clearDemoWalletHistory).toHaveBeenCalledWith("deposits", 2500, expect.any(String)));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
});
