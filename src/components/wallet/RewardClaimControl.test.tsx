import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RewardClaimControl } from "./RewardClaimControl";

const mocks = vi.hoisted(() => ({ claimReward: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/account/lifecycle-actions", () => ({ claimReward: mocks.claimReward }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/components/identity/DemoVerificationDialog", () => ({
  DemoVerificationDialog: () => <div role="dialog" aria-label="Sample identity check">Sample identity check</div>,
}));

beforeEach(() => {
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  mocks.claimReward.mockImplementation(async () => ({ status: "verification_required", message: "Complete the demo identity check to claim your prize." }));
});
afterEach(cleanup);

test("a first-time claim shows the explanation before the identity walkthrough", async () => {
  render(<RewardClaimControl rewardId="reward-1" />);
  fireEvent.submit(screen.getByRole("button", { name: "Claim reward" }).closest("form")!);

  expect(await screen.findByRole("dialog", { name: "Before you claim your reward" })).toBeTruthy();
  expect(screen.queryByRole("dialog", { name: "Sample identity check" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Continue to identity check" }));
  expect(await screen.findByRole("dialog", { name: "Sample identity check" })).toBeTruthy();
  expect(screen.queryByRole("dialog", { name: "Before you claim your reward" })).toBeNull();
});

test("Not now leaves the existing claim available without starting the check", async () => {
  render(<RewardClaimControl rewardId="reward-1" />);
  fireEvent.submit(screen.getByRole("button", { name: "Claim reward" }).closest("form")!);
  fireEvent.click(await screen.findByRole("button", { name: "Not now" }));

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Claim reward" })).toBeTruthy();
  fireEvent.submit(screen.getByRole("button", { name: "Claim reward" }).closest("form")!);
  expect(await screen.findByRole("dialog", { name: "Before you claim your reward" })).toBeTruthy();
});
