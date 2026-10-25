import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RewardClaimControl } from "./RewardClaimControl";

const mocks = vi.hoisted(() => ({ claimReward: vi.fn(), refresh: vi.fn(), begin: vi.fn(), skip: vi.fn() }));
vi.mock("@/lib/identity/demo-verification-actions", () => ({ beginDemoVerification: mocks.begin, skipDemoVerificationForPresentation: mocks.skip }));
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
  mocks.begin.mockResolvedValue({ verification: { id: "verification-1", step: "start" } });
  mocks.skip.mockResolvedValue({ verification: { id: "verification-1", step: "demo_skipped" } });
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

test("a visible demo preview does not imply the saved gift-card number is unlocked", () => {
  render(<RewardClaimControl rewardId="reward-1" previewShown />);
  expect(screen.getByText(/The sample above is for demonstration only/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Claim reward" })).toBeTruthy();
});

test("the MVP skip is persisted before retrying the real claim action", async () => {
  mocks.claimReward.mockResolvedValueOnce({ status: "verification_required", message: "Check required" }).mockResolvedValueOnce({ status: "succeeded", message: "Reward claimed" });
  render(<RewardClaimControl rewardId="reward-1" previewShown />);
  fireEvent.submit(screen.getByRole("button", { name: "Claim reward" }).closest("form")!);
  fireEvent.click(await screen.findByRole("button", { name: "Skip check & claim demo reward" }));
  expect(await screen.findByRole("button", { name: "Reward claimed" })).toBeTruthy();
  expect(mocks.begin).toHaveBeenCalledWith("reward-1");
  expect(mocks.skip).toHaveBeenCalledWith("reward-1", "verification-1");
  expect(mocks.claimReward).toHaveBeenCalledTimes(2);
  expect(mocks.refresh).toHaveBeenCalled();
});

test("a failed demo skip keeps the choice visible and cannot claim the reward", async () => {
  mocks.skip.mockResolvedValue({ error: "Demo skip unavailable" });
  render(<RewardClaimControl rewardId="reward-1" previewShown />);
  fireEvent.submit(screen.getByRole("button", { name: "Claim reward" }).closest("form")!);
  fireEvent.click(await screen.findByRole("button", { name: "Skip check & claim demo reward" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Demo skip unavailable");
  expect(mocks.claimReward).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Continue to identity check" })).toBeTruthy();
});
