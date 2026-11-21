import { expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PurchaseOptionsPage from "./page";

const { getAccountContext, checkPurchase } = vi.hoisted(() => ({ getAccountContext: vi.fn(), checkPurchase: vi.fn() }));
vi.mock("@/lib/account/bulk-purchase-actions", () => ({ checkDemoPurchaseReceipt: checkPurchase }));
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
  render(await visit(paid.entryId));
  expect(screen.getByRole("heading", { name: "This purchase option is unavailable" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /available options/ }).getAttribute("href")).toBe(`/account/purchase-options/${slug}`);
});

test("the original paid-ticket selector survives sign-in", async () => {
  getAccountContext.mockResolvedValue(null);
  const next = encodeURIComponent(`/account/purchase-options/${slug}?option=${paid.entryId}`);
  await expect(visit(paid.entryId)).rejects.toThrow(`/login?next=${next}`);
});

const choice = "33333333-3333-4333-8333-333333333333";
const walletQuery = { option: open.entryId, resume: "wallet", choice };
const walletReturn = `/account/purchase-options/${slug}?option=${open.entryId}&resume=wallet&choice=${choice}`;

test("session expiry during a wallet return carries the exact offer and saved choices to login", async () => {
  getAccountContext.mockResolvedValue(null);
  const searchParams = Promise.resolve({ ...walletQuery, next: "https://outside.example" });
  await expect(PurchaseOptionsPage({ params: Promise.resolve({ slug }), searchParams })).rejects.toThrow(
    `/login?next=${encodeURIComponent(walletReturn)}`,
  );
});

test("an unavailable activity read offers a retry of the same wallet return, which opens checkout when the read recovers", async () => {
  getAccountContext.mockResolvedValueOnce({ activity: { source: "unavailable", activity: [] } });
  const props = { params: Promise.resolve({ slug }), searchParams: Promise.resolve(walletQuery) };
  render(await PurchaseOptionsPage(props));
  const retry = screen.getByRole("link", { name: "Try again" }).getAttribute("href");
  expect(retry).toBe(walletReturn);
  expect(screen.getByRole("link", { name: "Go to My Activity" }).getAttribute("href")).toBe("/account/entries?filter=completion");
  expect(screen.queryByRole("button")).toBeNull();
  cleanup();

  getAccountContext.mockResolvedValueOnce({ userId: "owner", wallet: { scope: "demo", balanceCents: 10000 },
    activity: { source: "stored", activity: [{ ...open, completionOptionId: "option-1" }] } });
  const retryQuery = Object.fromEntries(new URL(retry!, "https://example.test").searchParams);
  const recovered = await PurchaseOptionsPage({ ...props, searchParams: Promise.resolve(retryQuery) });
  expect(recovered.props.initiallySelectedEntryId).toBe(open.entryId);
});

test("refreshing after the final offer was purchased opens completed purchases", async () => {
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [paid] } });
  await expect(visit()).rejects.toThrow("/account/entries?filter=completed");
});

test("a second tab opens Declined Offers after the final available offer is declined", async () => {
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [paid, { ...open, completionOptionStatus: "declined" }] } });
  await expect(visit()).rejects.toThrow("/account/declined-offers");
});

test("an old group link opens the exact expired offer in My Activity", async () => {
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [{ ...open, status: "completed", completionOptionStatus: "expired" }] } });
  for (const option of [undefined, open.entryId]) await expect(visit(option)).rejects.toThrow(`/account/entries?item=${slug}&entry=${open.entryId}`);
});

test("an unknown prize with no offers keeps the Wallet return and opens recovery", async () => {
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [] } });
  const transaction = "11111111-1111-4111-8111-111111111111";
  render(await PurchaseOptionsPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({ transaction, walletView: "1" }) }));
  expect(screen.getByRole("heading", { name: "This purchase option is unavailable" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to this transaction" }).getAttribute("href"))
    .toBe(`/account/wallet?view=history&transaction=${transaction}&walletView=1#transaction-${transaction}`);
  expect(screen.getByRole("link", { name: "Return to Purchase Options" }).getAttribute("href")).toBe("/account/entries?filter=completion#my-activity-filters");
  cleanup();
});

test("saved decline links render the modern checkout with the compact confirmation", async () => {
  getAccountContext.mockResolvedValue({ userId: "owner", fundingEnabled: true, wallet: { scope: "demo", balanceCents: 10000 }, activity: { source: "stored", activity: [{ ...open, completionOptionId: "option-1" }] } });
  const page = await PurchaseOptionsPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({ option: open.entryId, decline: "confirm" }) });
  expect(page.props.initiallyConfirmDecline).toBe(true);
  expect(page.props.initiallySelectedEntryId).toBe(open.entryId);
  expect(page.props.ownerId).toBe("owner");
  expect(page.props.initialBalance).toBe(10000);
});

test("refreshing an exact receipt after the final offer sells shows the authoritative amount and gift card", async () => {
  const receipt = "33333333-3333-4333-8333-333333333333";
  const card = { ...paid, rewardKind: "digital", rewardStatus: "ready" };
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [card] } });
  const href = "/account/wallet?reward=publix&rewardId=reward-1&via=purchase#reward-pass";
  checkPurchase.mockResolvedValueOnce({ status: "succeeded", purchasedCount: 1, totalCents: 9900, rewardIds: [card.rewardId], href });
  const view = render(await PurchaseOptionsPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({ receipt, option: paid.entryId }) }));
  expect(screen.getByRole("heading", { name: "Purchase receipt" })).toBeTruthy();
  expect(screen.getByText(/\$99 paid/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Open gift card" }).getAttribute("href")).toBe(href.replace("#", `&receipt=${receipt}#`));
  expect(checkPurchase).toHaveBeenCalledWith(receipt, slug);
  view.unmount();
});

test("a multi-card receipt lists only cards from this checkout in receipt order", async () => {
  const receipt = "33333333-3333-4333-8333-333333333333";
  const card = { ...paid, rewardKind: "digital", rewardStatus: "ready", image: "/test.png", priceCents: 10000 };
  getAccountContext.mockResolvedValue({ activity: { source: "stored", activity: [{ ...card, rewardId: "older" }, card, { ...card, rewardId: "reward-2" }] } });
  checkPurchase.mockResolvedValueOnce({ status: "succeeded", purchasedCount: 2, totalCents: 19800, rewardIds: ["reward-2", "reward-1"] });
  const view = render(await PurchaseOptionsPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({ receipt }) }));
  expect(screen.getByText("Your 2 gift cards are ready")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "View 2 gift cards" }));
  expect(screen.getAllByRole("link", { name: /Open card/ }).map(link => new URL(link.getAttribute("href")!, "https://example.test").searchParams.get("rewardId"))).toEqual(["reward-2", "reward-1"]);
  checkPurchase.mockResolvedValueOnce({ status: "succeeded", purchasedCount: 2, totalCents: 19800, rewardIds: ["reward-1", "reward-2"] });
  view.rerender(await PurchaseOptionsPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({ receipt: "44444444-4444-4444-8444-444444444444" }) }));
  expect(screen.queryByRole("link", { name: /Open card/ })).toBeNull();
  expect(screen.getByRole("button", { name: "View 2 gift cards" })).toBeTruthy();
  view.unmount();
});
