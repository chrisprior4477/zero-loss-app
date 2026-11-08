import { expect, test, vi } from "vitest";
import PurchaseOptionsPage from "./page";

const { getAccountContext } = vi.hoisted(() => ({ getAccountContext: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/payments/demo-provider", () => ({ DemoPaymentProvider: class {
  async getPaymentMethods() { return []; }
  async getRequests() { return []; }
} }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => { throw new Error(href); },
  notFound: () => { throw new Error("NOT_FOUND"); },
}));

const slug = "publix";
const paid = { entryId: "ent_11111111111111111111111111111111", slug, status: "completed", rewardSource: "purchase", rewardId: "reward-1" };
const open = { entryId: "ent_22222222222222222222222222222222", slug, status: "completion", completionOptionStatus: "available" };
function visit(option?: string) {
  return PurchaseOptionsPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({ option }) });
}

test.each([{ remaining: [] }, { remaining: [open] }])("a paid ticket opens its own card with other offers $remaining", async ({ remaining }) => {
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [paid, ...remaining] } });
  await expect(visit(paid.entryId)).rejects.toThrow("/account/wallet?reward=publix&rewardId=reward-1&via=purchase#reward-pass");
});

test("an unrecognized ticket never selects another open offer", async () => {
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [open] } });
  await expect(visit(paid.entryId)).rejects.toThrow("NOT_FOUND");
});

test("the original paid-ticket selector survives sign-in", async () => {
  getAccountContext.mockResolvedValue(null);
  const next = encodeURIComponent(`/account/purchase-options/${slug}?option=${paid.entryId}`);
  await expect(visit(paid.entryId)).rejects.toThrow(`/login?next=${next}`);
});

test("refreshing after the final offer was purchased opens completed purchases", async () => {
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [paid] } });
  await expect(visit()).rejects.toThrow("/account/entries?filter=completed");
});

test("a second tab opens Declined Offers after the final available offer is declined", async () => {
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [{ ...open, completionOptionStatus: "declined" }] } });
  await expect(visit()).rejects.toThrow("/account/declined-offers");
});

test("an unknown prize with no offers still reports not found", async () => {
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [] } });
  await expect(visit()).rejects.toThrow("NOT_FOUND");
});

test("saved decline links render the modern checkout with the compact confirmation", async () => {
  getAccountContext.mockResolvedValue({ userId: "owner", fundingEnabled: true, wallet: { scope: "demo", balanceCents: 10000 }, activity: { source: "stored", activity: [{ ...open, completionOptionId: "option-1" }] } });
  const page = await PurchaseOptionsPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({ option: open.entryId, decline: "confirm" }) });
  expect(page.props.initiallyConfirmDecline).toBe(true);
  expect(page.props.initiallySelectedEntryId).toBe(open.entryId);
  expect(page.props.ownerId).toBe("owner");
  expect(page.props.initialBalance).toBe(10000);
});
