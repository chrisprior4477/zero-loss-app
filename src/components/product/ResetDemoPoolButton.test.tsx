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
  await waitFor(() => expect(mocks.reset).toHaveBeenCalledWith("dunkin-25-gift-card"));
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});

test("keeps the confirmation open when reset fails", async () => {
  mocks.reset.mockResolvedValue({ status: "error", message: "An entry is being confirmed. Try again after its countdown." });
  render(<ResetDemoPoolButton slug="dunkin-25-gift-card" />);
  fireEvent.click(screen.getByRole("button", { name: "Reset Pool" }));
  fireEvent.click(screen.getByRole("group", { name: "Confirm demo pool reset" }).querySelector("button:last-child")!);
  expect(await screen.findByRole("status")).toHaveProperty("textContent", "An entry is being confirmed. Try again after its countdown.");
  expect(mocks.refresh).not.toHaveBeenCalled();
});
