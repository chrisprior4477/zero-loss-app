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
vi.mock("@/components/product/DemoParticipationPanel", () => ({ DemoParticipationPanel: () => <div>Entry form</div> }));
vi.mock("@/components/product/ProductGallery", () => ({ ProductGallery: () => <div>Product gallery</div> }));
vi.mock("@/components/product/GiftCardFulfillmentNotice", () => ({ GiftCardFulfillmentNotice: () => null, SignedOutRewardSummary: () => null }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("a saved win keeps its details accessible but does not offer another demo entry", async () => {
  mocks.availability.mockResolvedValue(null);
  const activity = storedActivityFixture();
  Object.assign(activity.activity[1], { rewardId: "saved-win", rewardStatus: "ready" });
  mocks.account.mockResolvedValue({ activity, wallet: { scope: "demo" } });
  render(await ItemPage({ params: Promise.resolve({ id: "samsung-m70h-tv" }), searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("heading", { name: "You already took part in this prize" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Claim your reward" }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv&rewardId=saved-win");
  expect(screen.queryByText(/Clear All Entries/)).toBeNull();
  expect(screen.queryByText("Entry form")).toBeNull();
  expect(screen.queryByRole("link", { name: /Prefer to enter without a purchase/ })).toBeNull();
  expect(mocks.requestHead).not.toHaveBeenCalled();
});

test("after clearing entries the same prize can be entered again", async () => {
  mocks.availability.mockResolvedValue(null);
  mocks.account.mockResolvedValue({ activity: { source: "customer-empty", activity: [] }, wallet: { scope: "demo" } });
  mocks.requestHead.mockResolvedValue({ ready: true, requestId: null });
  render(await ItemPage({ params: Promise.resolve({ id: "samsung-m70h-tv" }), searchParams: Promise.resolve({}) }));
  expect(screen.getByText("Entry form")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Prefer to enter without a purchase/ })).toBeTruthy();
});
