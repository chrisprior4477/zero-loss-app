import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  preview: vi.fn(),
  clear: vi.fn(),
}));
const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/wallet/demo-balance-actions", () => ({
  previewDemoBalanceClear: actions.preview,
  clearDemoBalance: actions.clear,
}));

import { DeleteAllFundsButton } from "./DeleteAllFundsButton";

afterEach(() => { cleanup(); actions.preview.mockReset(); actions.clear.mockReset(); navigation.refresh.mockReset(); });

test("asks for a fresh balance, explains the impact, and allows cancellation", async () => {
  actions.preview.mockResolvedValue({ status: "ready", balanceCents: 1750 });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  render(<DeleteAllFundsButton value="$17.50" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete Funds" }));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  expect(screen.getByText(/This will clear/).textContent).toContain("$17.50");
  expect(screen.getByText(/It will not delete your entries/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(actions.clear).not.toHaveBeenCalled();
});

test("zero balance does not issue a destructive request", async () => {
  actions.preview.mockResolvedValue({ status: "ready", balanceCents: 0 });
  render(<DeleteAllFundsButton value="$0.00" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete Funds" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("already $0"));
  expect(actions.clear).not.toHaveBeenCalled();
});

test("a failed balance check stays recoverable without requesting a reset", async () => {
  actions.preview.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ status: "ready", balanceCents: 13600 });
  render(<DeleteAllFundsButton value="$136" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete Funds" }));
  expect((await screen.findByRole("status")).textContent).toContain("No reset was requested");
  expect(actions.clear).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete Funds" }));
  expect(await screen.findByRole("dialog")).toBeTruthy();
});

test("a missing reset response checks the balance without another mutation", async () => {
  actions.preview.mockResolvedValueOnce({ status: "ready", balanceCents: 13600 }).mockRejectedValueOnce(new Error("Still offline")).mockResolvedValueOnce({ status: "ready", balanceCents: 0 });
  actions.clear.mockRejectedValue(new Error("Missing confirmation"));
  render(<DeleteAllFundsButton value="$136" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete Funds" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Clear demo funds" }));
  expect((await screen.findByRole("alert")).textContent).toContain("may already be saved");
  expect(screen.queryByRole("button", { name: "Clear demo funds" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Check wallet balance" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("still couldn’t check"));
  fireEvent.click(screen.getByRole("button", { name: "Check wallet balance" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("status").textContent).toContain("Balance is $0");
  expect(actions.clear).toHaveBeenCalledTimes(1);
  expect(actions.clear.mock.calls[0][0]).toBe(13600);
  expect(actions.clear.mock.calls[0][1]).toMatch(/^[a-f0-9-]{36}$/);
  expect(navigation.refresh).toHaveBeenCalledOnce();
});
