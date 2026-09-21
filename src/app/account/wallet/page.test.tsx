import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getAccountContext: vi.fn(), redirect: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.getAccountContext }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/identity/DemoVerificationDialog", () => ({ DemoIdentityPreviewButton: () => null }));
import WalletPage from "./page";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test.each([
  [{ reward: "samsung-m70h-tv", rewardId: "11111111-1111-4111-8111-111111111111" }, "/account/wallet?reward=samsung-m70h-tv&rewardId=11111111-1111-4111-8111-111111111111"],
  [{ view: "card" }, "/account/wallet?view=card"],
  [{ rewards: "history" }, "/account/wallet?rewards=history"],
  [{ view: "history", transaction: "11111111-1111-4111-8111-111111111111" }, "/account/wallet?view=history&transaction=11111111-1111-4111-8111-111111111111#transaction-11111111-1111-4111-8111-111111111111"],
  [{}, "/account/wallet"],
] as const)("expired sessions preserve the exact wallet view: %j", async (query, expected) => {
  mocks.getAccountContext.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(WalletPage({ searchParams: Promise.resolve(query) })).rejects.toThrow("NEXT_REDIRECT");
  expect(new URL(mocks.redirect.mock.calls[0][0], "https://example.test").searchParams.get("next")).toBe(expected);
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("an expired session keeps the funding destination and catalog prize through login", async () => {
  mocks.getAccountContext.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(WalletPage({ searchParams: Promise.resolve({ view: "history", from: "samsung-m70h-tv" }) })).rejects.toThrow("NEXT_REDIRECT");
  const destination = new URL(mocks.redirect.mock.calls[0][0], "https://example.test");
  expect(destination.pathname).toBe("/login");
  expect(destination.searchParams.get("next")).toBe("/account/wallet?view=history&from=samsung-m70h-tv#add-funds");
  expect(destination.searchParams.get("focus")).toBe("email");
  expect(destination.hash).toBe("#login-form");
});

test.each(["expired", "cancelled", "redeemed", "issuance_pending", "issuance_failed"])("%s never requests a saved code", async rewardStatus => {
  mocks.getAccountContext.mockResolvedValue({ activity: { source: "stored", isPreview: true, activity: [{
    slug: "test-reward", title: "Test", retailer: "Test retailer", image: "/test.png", priceCents: 2500,
    status: "completed", rewardKind: "digital", rewardStatus, rewardId: "reward-1", rewardClaimedAt: "2026-09-21T12:00:00Z",
  }] } });
  render(await WalletPage({ searchParams: Promise.resolve({ rewardId: "reward-1" }) }));
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Sample reward barcode")).toBeNull();
});

test("a credential read error cannot fall back to another sample number", async () => {
  mocks.getAccountContext.mockResolvedValue({ activity: { source: "stored", isPreview: true, activity: [{
    slug: "test-reward", title: "Test", retailer: "Test retailer", image: "/test.png", priceCents: 2500,
    status: "prize", rewardKind: "digital", rewardStatus: "ready", rewardId: "reward-1", rewardClaimedAt: "2026-09-21T12:00:00Z",
  }] } });
  mocks.rpc.mockResolvedValue({ data: { code: "123456789012" }, error: { code: "XX000" } });
  render(await WalletPage({ searchParams: Promise.resolve({ rewardId: "reward-1" }) }));
  expect(mocks.rpc).toHaveBeenCalledWith("get_claimed_reward", { p_reward_id: "reward-1" });
  expect(screen.queryByLabelText("Sample reward barcode")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("couldn’t load your saved");
});

test.each(["samsung-m70h-tv", "not-in-the-catalog", "https://evil.test", ["samsung-m70h-tv", "other"]])("only a known catalog prize produces a return link: %s", async (from) => {
  mocks.getAccountContext.mockResolvedValue({
    activity: { source: "customer-empty", isPreview: false, activity: [], activeCount: 0 },
    wallet: null, fundingEnabled: false,
  });
  render(await WalletPage({ searchParams: Promise.resolve({ view: "history", from }) }));
  const link = screen.queryByRole("link", { name: "Back to this prize" });
  if (from === "samsung-m70h-tv") {
    expect(link?.getAttribute("href")).toBe("/items/samsung-m70h-tv#enter-entry");
  } else {
    expect(link).toBeNull();
  }
});
