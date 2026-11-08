import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ restart: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/account/lifecycle-actions", () => ({ restartPreviewReward: mocks.restart }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
import { DemoRewardRestartControl } from "./DemoRewardRestartControl";

afterEach(() => { cleanup(); vi.resetAllMocks(); });

test("shows a compact orange restart bar and explains that history is retained before submission", () => {
  render(<DemoRewardRestartControl rewardId="22222222-2222-4222-8222-222222222222" />);
  const opener = screen.getByRole("button", { name: "Remove sample reward & restart demo" });
  expect(opener.className).toContain("bg-[#ff7417]");
  fireEvent.click(opener);
  expect(screen.getByText(/original entry, purchase, and wallet history stay saved/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Remove & restart demo" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep reward" }));
  expect(screen.getByRole("button", { name: "Remove sample reward & restart demo" })).toBeTruthy();
});

test("losing the restart reply keeps the reward page usable and a saved restart opens its prize", async () => {
  mocks.restart.mockRejectedValueOnce(new Error("Connection lost"))
    .mockResolvedValueOnce({ status: "succeeded", href: "/items/samsung-m70h-tv#enter-entry", message: "Restart confirmed." });
  render(<DemoRewardRestartControl rewardId="22222222-2222-4222-8222-222222222222" />);
  fireEvent.click(screen.getByRole("button", { name: "Remove sample reward & restart demo" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove & restart demo" }));
  await screen.findByRole("button", { name: "Check restart status" });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.click(screen.getByRole("button", { name: "Check restart status" }));
  fireEvent.click(screen.getByRole("button", { name: "Check restart status" }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/items/samsung-m70h-tv#enter-entry"));
  expect(mocks.restart.mock.calls.map(([, data]) => data.get("intent"))).toEqual(["restart", "check"]);
});

test("an unreadable result can be checked again, and an absent receipt offers a fresh choice", async () => {
  mocks.restart.mockResolvedValueOnce({ status: "error", recovery: "check", message: "Check the saved result." })
    .mockRejectedValueOnce(new Error("Still offline"))
    .mockResolvedValueOnce({ status: "error", message: "No completed restart was found." });
  render(<DemoRewardRestartControl rewardId="22222222-2222-4222-8222-222222222222" />);
  fireEvent.click(screen.getByRole("button", { name: "Remove sample reward & restart demo" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove & restart demo" }));
  fireEvent.click(await screen.findByRole("button", { name: "Check restart status" }));
  fireEvent.click(await screen.findByRole("button", { name: "Check restart status" }));
  await screen.findByRole("button", { name: "Remove & restart demo" });
  fireEvent.click(screen.getByRole("button", { name: "Keep reward" }));
  expect(mocks.restart.mock.calls.map(([, data]) => data.get("intent"))).toEqual(["restart", "check", "check"]);
  expect(mocks.push).not.toHaveBeenCalled();
});
