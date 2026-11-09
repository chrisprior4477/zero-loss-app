import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getAccountContext: vi.fn(), redirect: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.getAccountContext }));
vi.mock("@/lib/catalog/availability-reader", () => ({ getOfferingAvailability: async () => ({ "playstation-5-slim": { entryPriceCents: 100 } }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/identity/DemoVerificationDialog", () => ({ DemoIdentityPreviewButton: () => null }));
import WalletPage from "./page";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const purchaseEntry = "ent_11111111111111111111111111111111";

test.each(["ready", "used", "expired", "history"])("the %s reward view survives an expired session", async rewards => {
  mocks.getAccountContext.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(WalletPage({searchParams:Promise.resolve({rewards})})).rejects.toThrow("NEXT_REDIRECT");
  expect(new URL(mocks.redirect.mock.calls[0][0],"https://example.test").searchParams.get("next"))
    .toBe(`/account/wallet?rewards=${rewards}#${rewards === "ready" ? "ready-rewards" : "reward-history"}`);
});

test.each([ ["methods", "payment-methods"], ["card", "wallet-add-card"] ])("the %s payment panel survives signed-out navigation", async (panel, anchor) => {
  mocks.getAccountContext.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(WalletPage({ searchParams: Promise.resolve({ view: "history", panel }) })).rejects.toThrow("NEXT_REDIRECT");
  const next = new URL(mocks.redirect.mock.calls[0][0], "https://example.test").searchParams.get("next");
  expect(next).toBe(`/account/wallet?view=history&panel=${panel}#${anchor}`);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
const purchaseActivity = { entryId: purchaseEntry, slug: "babys-essentials-bundle", title: "Baby bundle", retailer: "Walmart", image: "/test.png", status: "completion", rewardKind: "digital", priceCents: 10000, paidCents: 100, remainingCents: 9900, completionOptionId: "11111111-1111-4111-8111-111111111111" };

test("existing active entries return to their own review, never a purchase option", async () => {
  mocks.getAccountContext.mockResolvedValue({ wallet: null, fundingEnabled: false, activity: { source: "stored", activity: [{ ...purchaseActivity, slug: "playstation-5-slim", status: "active" }] } });
  render(await WalletPage({ searchParams: Promise.resolve({ view: "history", from: "playstation-5-slim", entry: purchaseEntry, quantity: "23", review: "entry" }) }));
  expect(screen.getByRole("link", { name: "Back to entry review" }).getAttribute("href")).toBe(`/account/entries/${purchaseEntry}?quantity=23&review=entry#additional-entry-checkout`);
  expect(screen.getByRole("link", { name: "Back to 23 selected entries" }).getAttribute("href")).toBe(`/account/entries/${purchaseEntry}?quantity=23&review=entry#additional-entry-checkout`);
  expect(screen.queryByRole("link", { name: "Back to purchase option" })).toBeNull();
});

test("expired sessions keep the additional-entry funding context", async () => {
  mocks.getAccountContext.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(WalletPage({ searchParams: Promise.resolve({ view: "history", from: "playstation-5-slim", entry: purchaseEntry, quantity: "23", review: "entry" }) })).rejects.toThrow("NEXT_REDIRECT");
  const next = new URL(mocks.redirect.mock.calls[0][0], "https://example.test").searchParams.get("next")!;
  expect(next).toContain(`entry=${purchaseEntry}&quantity=23&review=entry#add-funds`);
});

test("funding keeps shopping filters through expired-session login and Back to this prize", async () => {
  const browse = "/browse?category=electronics&sort=fewest-left";
  const query = { view: "history", from: "samsung-m70h-tv", quantity: "4", browse };
  mocks.getAccountContext.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(WalletPage({ searchParams: Promise.resolve(query) })).rejects.toThrow("NEXT_REDIRECT");
  const next = new URL(mocks.redirect.mock.calls[0][0], "https://example.test").searchParams.get("next")!;
  expect(new URL(next, "https://example.test").searchParams.get("browse")).toBe(browse);
  mocks.redirect.mockReset();
  mocks.getAccountContext.mockResolvedValue({ wallet: null, fundingEnabled: false, activity: { source: "customer-empty", activity: [] } });
  render(await WalletPage({ searchParams: Promise.resolve(query) }));
  expect(screen.getByRole("link", { name: "Back to this prize" }).getAttribute("href"))
    .toBe(`/items/samsung-m70h-tv?quantity=4&from=${encodeURIComponent(browse)}#enter-entry`);
  expect(screen.getByRole("link", { name: "Back to 4 selected entries" }).closest("#balance")).toBeTruthy();
});

test.each([{ browse: "https://evil.test/browse" }, { browse: ["/browse?category=electronics", "/browse?category=gas"] }])("invalid shopping context is not forwarded: %j", async ({ browse }) => {
  mocks.getAccountContext.mockResolvedValue({ wallet: null, fundingEnabled: false, activity: { source: "customer-empty", activity: [] } });
  render(await WalletPage({ searchParams: Promise.resolve({ view: "history", from: "samsung-m70h-tv", browse }) }));
  expect(screen.getByRole("link", { name: "Back to this prize" }).getAttribute("href")).toBe("/items/samsung-m70h-tv#enter-entry");
});
test("funding returns to the exact authorized option even with another entry for the same product", async () => {
  mocks.getAccountContext.mockResolvedValue({ wallet: null, fundingEnabled: false, activity: { source: "stored", activity: [{ ...purchaseActivity, entryId: "ent_22222222222222222222222222222222" }, purchaseActivity] } });
  render(await WalletPage({ searchParams: Promise.resolve({ view: "history", from: purchaseActivity.slug, entry: purchaseEntry }) }));
  expect(screen.getByRole("link", { name: "Back to purchase option" }).getAttribute("href")).toBe(`/account/purchase-options/${purchaseActivity.slug}?option=${purchaseEntry}&resume=wallet`);
  expect(screen.queryByRole("link", { name: "Back to this prize" })).toBeNull();
});
test.each(["ent_99999999999999999999999999999999", [purchaseEntry, purchaseEntry]])("foreign or ambiguous funding selectors cannot substitute another entry: %j", async entry => {
  mocks.getAccountContext.mockResolvedValue({ wallet: null, fundingEnabled: false, activity: { source: "stored", activity: [purchaseActivity] } });
  render(await WalletPage({ searchParams: Promise.resolve({ view: "history", from: purchaseActivity.slug, entry }) }));
  expect(screen.queryByRole("link", { name: "Back to purchase option" })).toBeNull();
  expect(screen.getByRole("link", { name: "View your purchase options →" })).toBeTruthy();
});
test("sign-in preserves the exact funding return entry", async () => {
  mocks.getAccountContext.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(WalletPage({ searchParams: Promise.resolve({ view: "history", from: purchaseActivity.slug, entry: purchaseEntry }) })).rejects.toThrow("NEXT_REDIRECT");
  expect(new URL(mocks.redirect.mock.calls[0][0], "https://example.test").searchParams.get("next")).toBe(`/account/wallet?view=history&from=${purchaseActivity.slug}&entry=${purchaseEntry}#add-funds`);
});

test.each([
  [{ reward: "samsung-m70h-tv", rewardId: "11111111-1111-4111-8111-111111111111" }, "/account/wallet?reward=samsung-m70h-tv&rewardId=11111111-1111-4111-8111-111111111111"],
  [{ view: "card" }, "/account/wallet?view=card"],
  [{ rewards: "history" }, "/account/wallet?rewards=history#reward-history"],
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

test("funding preserves the selected count through login and back to the product", async () => {
  mocks.getAccountContext.mockResolvedValue(null);
  mocks.redirect.mockImplementationOnce(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(WalletPage({ searchParams: Promise.resolve({ view: "history", from: "samsung-m70h-tv", quantity: "4" }) })).rejects.toThrow("NEXT_REDIRECT");
  expect(new URL(mocks.redirect.mock.calls[0][0], "https://example.test").searchParams.get("next")).toBe("/account/wallet?view=history&from=samsung-m70h-tv&quantity=4#add-funds");
  mocks.redirect.mockReset();
  mocks.getAccountContext.mockResolvedValue({
    activity: { source: "customer-empty", isPreview: false, activity: [], activeCount: 0 },
    wallet: null, fundingEnabled: false,
  });
  render(await WalletPage({ searchParams: Promise.resolve({ view: "history", from: "samsung-m70h-tv", quantity: "4" }) }));
  expect(screen.getByRole("link", { name: "Back to this prize" }).getAttribute("href")).toBe("/items/samsung-m70h-tv?quantity=4#enter-entry");
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

test.each([
  { via: "purchase", count: 0, label: null },
  { via: "purchase", count: 1, label: "View your remaining 1 Walmart offer" },
  { via: "purchase", count: 2, label: "View your remaining 2 Walmart offers" },
  { via: undefined, count: 2, label: null },
])("issued card shortcut follows arrival and same-prize availability: %j", async ({ via, count, label }) => {
  const rewardId = "reward-1";
  const paid = { ...purchaseActivity, status: "completed", rewardSource: "purchase", rewardStatus: "ready", rewardClaimedAt: "2026-09-21T12:00:00Z", rewardId };
  const kept = Array.from({ length: count }, (_, i) => ({ ...purchaseActivity, entryId: `open-${i}` }));
  mocks.getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [
    paid, ...kept, { ...purchaseActivity, slug: "different-prize-same-retailer" },
    { ...purchaseActivity, completionOptionStatus: "declined" }, { ...purchaseActivity, completionOptionStatus: "expired" },
  ] } });
  mocks.rpc.mockResolvedValue({ data: { code: "123456789012" } });
  render(await WalletPage({ searchParams: Promise.resolve({ rewardId, via }) }));
  expect(screen.getByRole("button", { name: "Copy number" })).toBeTruthy();
  if (label) {
    const link = screen.getByRole("link", { name: label });
    expect(link.getAttribute("href")).toBe(`/account/purchase-options/${purchaseActivity.slug}`);
    expect(link.nextElementSibling?.textContent).toBe("Continue Shopping");
  } else {
    expect(screen.queryByRole("link", { name: /View your remaining/ })).toBeNull();
  }
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


test("the wallet carries an exact selection snapshot back to an authorized purchase", async () => {
  const choice = "22222222-2222-4222-8222-222222222222";
  mocks.getAccountContext.mockResolvedValue({ wallet: null, fundingEnabled: false, activity: { source: "stored", activity: [purchaseActivity] } });
  render(await WalletPage({ searchParams: Promise.resolve({ view: "history", from: purchaseActivity.slug, entry: purchaseEntry, choice }) }));
  expect(screen.getByRole("link", { name: "Back to purchase option" }).getAttribute("href")).toBe('/account/purchase-options/' + purchaseActivity.slug + '?option=' + purchaseEntry + '&resume=wallet&choice=' + choice);
});
