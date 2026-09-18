import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import MyZeroLossPage from "./page";

const mocks = vi.hoisted(() => ({ account: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("@/components/account/MyZeroLossActivity", () => ({ MyZeroLossActivity: () => <div>Activity</div> }));

beforeEach(() => mocks.account.mockResolvedValue({
  displayName: "Chris Prior",
  initials: "CP",
  avatarUrl: null,
  emailConfirmed: true,
  fundingEnabled: true,
  activity: { activity: [], activeCount: 0, isPreview: false, source: "customer" },
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("Your Account and Security opens Account & Security from My Zero Loss", async () => {
  render(await MyZeroLossPage({ searchParams: Promise.resolve({}) }));
  const link = screen.getByRole("link", { name: "Open Your Account and Security" });
  expect(link.getAttribute("href")).toBe("/account/security");
  expect(link.textContent).toContain("Your Account and Security");
});
