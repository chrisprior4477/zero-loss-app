import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/lib/account/lifecycle-actions", () => ({ restartPreviewReward: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { DemoRewardRestartControl } from "./DemoRewardRestartControl";

afterEach(cleanup);

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
