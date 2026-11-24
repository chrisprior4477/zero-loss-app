import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import MyZeroLossPage from "./page";

const mocks = vi.hoisted(() => ({ account: vi.fn(), auth: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth } }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("@/components/account/MyZeroLossActivity", () => ({ MyZeroLossActivity: () => <div>Activity</div> }));

beforeEach(() => {
  mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
  mocks.account.mockResolvedValue({
    displayName: "Chris Prior",
    initials: "CP",
    avatarUrl: null,
    emailConfirmed: true,
    fundingEnabled: true,
    activity: { activity: [], activeCount: 0, isPreview: false, source: "customer" },
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("login preserves the selected entry and filter", async () => {
  mocks.account.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(MyZeroLossPage({ searchParams: Promise.resolve({ item: "nike-court-shot-shoes", entry: "ent_123", filter: "completion" }) })).rejects.toThrow("NEXT_REDIRECT");
  expect(new URL(mocks.redirect.mock.calls[0][0], "https://example.test").searchParams.get("next")).toBe("/account/entries?item=nike-court-shot-shoes&entry=ent_123&filter=completion#my-activity-filters");
});

test("an unavailable sign-in check preserves the current activity view for retry", async () => {
  mocks.account.mockResolvedValueOnce(null);
  mocks.auth.mockResolvedValueOnce({ data: { user: null }, error: { status: 503 } });
  render(await MyZeroLossPage({ searchParams: Promise.resolve({ filter: "active" }) }));
  expect(screen.getByRole("link", { name: "Try again" }).getAttribute("href")).toBe("/account/entries?filter=active#my-activity-filters");
  expect(mocks.redirect).not.toHaveBeenCalled();
});

test("Declined Offers carries the selected My Activity filter", async () => {
  render(await MyZeroLossPage({ searchParams: Promise.resolve({ filter: "completion" }) }));
  expect(screen.getByRole("link", { name: /Declined Offers/ }).getAttribute("href")).toBe("/account/declined-offers?filter=completion&from=activity-tools");
});

test("Your Profile opens the profile settings from My Activity", async () => {
  render(await MyZeroLossPage({ searchParams: Promise.resolve({}) }));
  const link = screen.getByRole("link", { name: "Open Your Profile" });
  expect(link.getAttribute("href")).toBe("/account/profile#account-settings-sections");
  expect(link.textContent).toContain("Your Profile");
  expect(screen.getByRole("link", { name: /Declined Offers/ }).getAttribute("href")).toBe("/account/declined-offers?from=activity-tools");
});
