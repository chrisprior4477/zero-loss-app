import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  preview: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@/lib/wallet/demo-balance-actions", () => ({
  previewDemoBalanceClear: actions.preview,
  clearDemoBalance: actions.clear,
}));

import { DeleteAllFundsButton } from "./DeleteAllFundsButton";

afterEach(() => { cleanup(); actions.preview.mockReset(); actions.clear.mockReset(); });

test("asks for a fresh balance, explains the impact, and allows cancellation", async () => {
  actions.preview.mockResolvedValue({ status: "ready", balanceCents: 1750 });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  render(<DeleteAllFundsButton value="$17.50" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete All Funds" }));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  expect(screen.getByText(/This will clear/).textContent).toContain("$17.50");
  expect(screen.getByText(/It will not delete your entries/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(actions.clear).not.toHaveBeenCalled();
});

test("zero balance does not issue a destructive request", async () => {
  actions.preview.mockResolvedValue({ status: "ready", balanceCents: 0 });
  render(<DeleteAllFundsButton value="$0.00" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete All Funds" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("already $0"));
  expect(actions.clear).not.toHaveBeenCalled();
});
