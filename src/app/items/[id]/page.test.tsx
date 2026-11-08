import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ItemPage from "./page";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";

const mocks = vi.hoisted(() => ({ account: vi.fn(), availability: vi.fn(), requestHead: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/catalog/availability-reader", () => ({ getOfferingAvailability: mocks.availability }));
vi.mock("@/lib/entries/request-head", () => ({ getEntryRequestHead: mocks.requestHead }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/sharing/receiving-reader", () => ({ getSharedProductContext: vi.fn(async () => null) }));
vi.mock("@/components/product/DemoParticipationPanel", () => ({ DemoParticipationPanel: ({ browseReturnHref }: { browseReturnHref?: string }) => <div data-browse-return={browseReturnHref}>Entry form</div> }));
vi.mock("@/components/product/ProductGallery", () => ({ ProductGallery: () => <div>Product gallery</div> }));
vi.mock("@/components/product/GiftCardFulfillmentNotice", () => ({ GiftCardFulfillmentNotice: () => null, SignedOutRewardSummary: () => null }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("the product passes the same validated shopping destination to entry and Back controls", async () => {
  const from = "/browse?category=electronics&sort=fewest-left";
  mocks.availability.mockResolvedValue(null);
  mocks.account.mockResolvedValue({ activity: { source: "customer-empty", activity: [] }, wallet: { scope: "demo" } });
  mocks.requestHead.mockResolvedValue({ ready: true, requestId: null });
  render(await ItemPage({ params: Promise.resolve({ id: "samsung-m70h-tv" }), searchParams: Promise.resolve({ from }) }));
  expect(screen.getByText("Entry form").getAttribute("data-browse-return")).toBe(from);
  expect(screen.getByRole("link", { name: "← Back to Electronics" }).getAttribute("href")).toBe(from);
  const instructions = screen.getByRole("link", { name: /Prefer to enter without a purchase/ }).getAttribute("href")!;
  expect(new URL(instructions, "https://example.test").searchParams.get("from")).toBe(from);
});

test("a retailer reward product returns to its retailer and keeps that path for funding and free entry", async () => {
  const from = "/rewards/nintendo";
  mocks.availability.mockResolvedValue(null);
  mocks.account.mockResolvedValue({ activity: { source: "customer-empty", activity: [] }, wallet: { scope: "demo" } });
  mocks.requestHead.mockResolvedValue({ ready: true, requestId: null });
  render(await ItemPage({ params: Promise.resolve({ id: "nintendo-100-gift-card" }), searchParams: Promise.resolve({ from }) }));
  expect(screen.getByRole("link", { name: "← Back to Nintendo rewards" }).getAttribute("href")).toBe(from);
  expect(screen.getByText("Entry form").getAttribute("data-browse-return")).toBe(from);
  const instructions = screen.getByRole("link", { name: /Prefer to enter without a purchase/ }).getAttribute("href")!;
  expect(new URL(instructions, "https://example.test").searchParams.get("from")).toBe(from);
});

test("a stale product link takes its winner directly to the earned reward", async () => {
  mocks.availability.mockResolvedValue(null);
  const activity = storedActivityFixture();
  Object.assign(activity.activity[1], { rewardId: "saved-win", rewardStatus: "ready" });
  mocks.account.mockResolvedValue({ activity, wallet: { scope: "demo" } });
  await expect(ItemPage({ params: Promise.resolve({ id: "samsung-m70h-tv" }), searchParams: Promise.resolve({}) }))
    .rejects.toMatchObject({ digest: expect.stringContaining("/account/wallet?reward=samsung-m70h-tv&rewardId=saved-win") });
  expect(mocks.requestHead).not.toHaveBeenCalled();
});

test("a full pool closes the old shopping link but keeps its holder's receipt accessible", async () => {
  const slug = "best-buy-100-gift-card";
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  try {
    mocks.availability.mockResolvedValue({ [slug]: { capacity: 300, sold: 300, remaining: 0, entryPriceCents: 100 } });
    mocks.account.mockResolvedValue({ activity: { source: "customer-empty", activity: [] }, wallet: { scope: "demo" } });
    const props = { params: Promise.resolve({ id: slug }), searchParams: Promise.resolve({ from: "/rewards/best-buy" }) };
    mocks.requestHead.mockResolvedValue({ ready: true, requestId: null });
    await expect(ItemPage(props)).rejects.toMatchObject({ digest: expect.stringContaining("/rewards/best-buy") });
    mocks.requestHead.mockResolvedValue({ ready: true, requestId: "my-hold", validating: true });
    render(await ItemPage(props));
    expect(screen.getByText("Entry form")).toBeTruthy();
    expect(screen.queryByText(/reset pool|Prefer to enter without a purchase/i)).toBeNull();
  } finally { vi.unstubAllEnvs(); }
});

test("after clearing entries the same prize can be entered again", async () => {
  mocks.availability.mockResolvedValue(null);
  mocks.account.mockResolvedValue({ activity: { source: "customer-empty", activity: [] }, wallet: { scope: "demo" } });
  mocks.requestHead.mockResolvedValue({ ready: true, requestId: null });
  render(await ItemPage({ params: Promise.resolve({ id: "samsung-m70h-tv" }), searchParams: Promise.resolve({}) }));
  expect(screen.getByText("Entry form")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Prefer to enter without a purchase/ })).toBeTruthy();
});
