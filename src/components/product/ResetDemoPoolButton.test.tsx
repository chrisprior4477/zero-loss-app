import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResetDemoPoolButton } from "./ResetDemoPoolButton";

const mocks = vi.hoisted(() => ({ reset: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/catalog/actions", () => ({ resetDemoPool: mocks.reset }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

test("asks before changing a full demo pool and refreshes after a verified reset", async () => {
  mocks.reset.mockResolvedValue({ status: "succeeded", message: "Demo pool reset. One ticket is available again." });
  render(<ResetDemoPoolButton slug="dunkin-25-gift-card" />);
  fireEvent.click(screen.getByRole("button", { name: "Reset Pool" }));
  expect(screen.getByText(/Existing entries, results, and purchase options stay saved/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(mocks.reset).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Reset Pool" }));
  fireEvent.click(screen.getByRole("group", { name: "Confirm demo pool reset" }).querySelector("button:last-child")!);
  await waitFor(() => expect(mocks.reset).toHaveBeenCalledWith("dunkin-25-gift-card", false));
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});

test("a lost reply releases Cancel and checks the saved pool without a second reset", async () => {
  mocks.reset.mockRejectedValueOnce(new Error("Lost reply"))
    .mockRejectedValueOnce(new Error("Still offline"))
    .mockResolvedValueOnce({ status: "succeeded", message: "The pool is open with one ticket available." });
  render(<ResetDemoPoolButton slug="dunkin-25-gift-card" />);
  fireEvent.click(screen.getByRole("button", { name: "Reset Pool" }));
  fireEvent.click(screen.getByRole("button", { name: "Reset Pool" }));
  const check = await screen.findByRole("button", { name: "Check pool" });
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", false);
  fireEvent.click(check);
  await screen.findByRole("button", { name: "Check pool" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Check pool" }));
  fireEvent.click(screen.getByRole("button", { name: "Check pool" }));
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  expect(mocks.reset.mock.calls.map(([, checkOnly]) => checkOnly)).toEqual([false, true, true]);
});

test("keeps the confirmation open when reset fails", async () => {
  mocks.reset.mockResolvedValue({ status: "error", message: "An entry is being confirmed. Try again after its countdown." });
  render(<ResetDemoPoolButton slug="dunkin-25-gift-card" />);
  fireEvent.click(screen.getByRole("button", { name: "Reset Pool" }));
  fireEvent.click(screen.getByRole("group", { name: "Confirm demo pool reset" }).querySelector("button:last-child")!);
  expect(await screen.findByRole("status")).toHaveProperty("textContent", "An entry is being confirmed. Try again after its countdown.");
  expect(mocks.refresh).not.toHaveBeenCalled();
});

test("a full pool after a lost reply needs a new confirmation to reset", async () => {
  mocks.reset.mockRejectedValueOnce(new Error("Lost reply"))
    .mockResolvedValueOnce({ status: "error", message: "The pool is currently full." })
    .mockResolvedValueOnce({ status: "succeeded", message: "Demo pool reset." });
  render(<ResetDemoPoolButton slug="dunkin-25-gift-card" />);
  fireEvent.click(screen.getByRole("button", { name: "Reset Pool" }));
  fireEvent.click(screen.getByRole("button", { name: "Reset Pool" }));
  fireEvent.click(await screen.findByRole("button", { name: "Check pool" }));
  const retry = await screen.findByRole("button", { name: "Reset Pool" });
  expect(mocks.reset.mock.calls.map(([, check]) => check)).toEqual([false, true]);
  fireEvent.click(retry);
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  expect(mocks.reset.mock.calls.map(([, check]) => check)).toEqual([false, true, false]);
});
