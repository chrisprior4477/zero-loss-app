import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { drawerState } from "@/lib/account/drawer-state";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { walletRewards, activityHref } from "@/lib/account/activity";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import { WalletShortcut } from "./WalletShortcut";
import WalletPage from "@/app/account/wallet/page";

const mocks = vi.hoisted(() => ({ account: vi.fn(), redirect: vi.fn((href: string) => { throw new Error(`redirect:${href}`); }) }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
const wallet: WalletSnapshot = { walletAccountId: null, scope: "production", currency: "USD", balanceCents: 0, transactionCount: 0, fundingAvailable: false, entries: [] };
beforeEach(() => { vi.clearAllMocks(); mocks.account.mockResolvedValue({ activity: storedActivityFixture(), wallet }); });
afterEach(cleanup);

test("wallet shortcut count comes only from digital prize activity, not entries or dollars", () => {
  const state = storedActivityFixture();
  expect(walletRewards(state)).toHaveLength(1);
  expect(activityHref(state.activity[1], "/account", "prize")).toBe("/account/wallet?reward=samsung-m70h-tv");
  const { rerender } = render(<WalletShortcut state={state} />);
  expect(screen.getByRole("link", { name: "Prize Ready — 1 reward" }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv");
  rerender(<WalletShortcut state={drawerState(false)} />);
  expect(screen.getByRole("link", { name: "Prize Ready — Reward count unavailable" })).toBeTruthy();
  expect(screen.queryByText("0")).toBeNull();
});

test("wallet collection contains only the authorized reward and its direct local destination", async () => {
  render(await WalletPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getAllByText('Samsung 50" M70H Mini LED 4K Smart TV')).toHaveLength(2);
  expect(screen.queryByText("PlayStation 5 Slim Model")).toBeNull();
  expect(screen.getByRole("link", { name: /Open reward/ }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv");
  expect(screen.queryByText("Sample · Not redeemable")).toBeNull();
});

test("reward overview uses real statuses and retains authorized history links", async () => {
  const state = storedActivityFixture();
  const ready = state.activity[1];
  ready.rewardId = "ready-reward";
  state.activity.push({ ...ready, entryId: "used-entry", rewardId: "used-reward", rewardStatus: "redeemed", status: "completed" });
  state.activity.push({ ...ready, entryId: "expired-entry", rewardId: "expired-reward", rewardStatus: "expired", status: "completed" });
  mocks.account.mockResolvedValue({ activity: state, wallet, balanceLabel: "$0.00", fundingEnabled: false });
  render(await WalletPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("link", { name: /Prize Ready: 1/ }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv&rewardId=ready-reward");
  expect(screen.getByRole("link", { name: /Used.*Already redeemed.*1/ }).getAttribute("href")).toBe("/account/wallet?rewards=used");
  expect(screen.getByRole("link", { name: /Expired.*No longer available.*1/ }).getAttribute("href")).toBe("/account/wallet?rewards=expired");
  expect(screen.getByRole("region", { name: "Reward history" }).querySelectorAll('a[aria-label^="Open "]')).toHaveLength(3);
  expect(screen.getByRole("link", { name: /Open Samsung.*Used/ }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv&rewardId=used-reward");
});

test("specific reward opens its redemption destination without another dialog or reveal button", async () => {
  render(await WalletPage({ searchParams: Promise.resolve({ reward: "samsung-m70h-tv" }) }));
  expect(screen.getByRole("region", { name: "Reward redemption details" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Not issued yet");
  expect(screen.getByText(/No gift card or redeemable barcode has been issued/)).toBeTruthy();
  expect(screen.getAllByText("$400")).toHaveLength(2);
  expect((screen.getByRole("button", { name: "Add to Apple Wallet" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Save to Google Wallet" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("link", { name: "Back to Gift Cards & Rewards" }).getAttribute("href")).toBe("/account/wallet");
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("same-product rewards use their own reward ID and ambiguous old URLs do not open another card", async () => {
  const state = storedActivityFixture();
  const first = state.activity[1];
  first.rewardId = "reward-one";
  const second = { ...first, entryId: "entry-two", rewardId: "reward-two", priceCents: 50000 };
  state.activity.push(second);
  mocks.account.mockResolvedValue({ activity: state, wallet });
  expect(activityHref(second)).toBe("/account/wallet?reward=samsung-m70h-tv&rewardId=reward-two");
  const { rerender } = render(await WalletPage({ searchParams: Promise.resolve({ reward: first.slug, rewardId: "reward-two" }) }));
  expect(screen.getByRole("region", { name: "Reward redemption details" })).toBeTruthy();
  expect(screen.getAllByText("$500").length).toBeGreaterThan(0);
  rerender(await WalletPage({ searchParams: Promise.resolve({ reward: first.slug }) }));
  expect(screen.getByText("Reward unavailable")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Reward redemption details" })).toBeNull();
});

test("preview reward renders a responsive sample redemption without pretending it is live", async () => {
  const preview = storedActivityFixture();
  mocks.account.mockResolvedValue({ activity: { ...preview, isPreview: true }, wallet });
  render(await WalletPage({ searchParams: Promise.resolve({ reward: "samsung-m70h-tv" }) }));
  expect(screen.getByText("Best Buy")).toBeTruthy();
  expect(screen.getByText("Sample — not redeemable")).toBeTruthy();
  expect(screen.getByLabelText("Sample reward barcode")).toBeTruthy();
  expect(screen.getByRole("img", { name: 'Samsung 50" M70H Mini LED 4K Smart TV' })).toBeTruthy();
  expect(screen.getByText(/Use it on anything Best Buy sells/)).toBeTruthy();
  expect(screen.getByText(/not a restriction on your reward/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Copy number" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Present in store" })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Add to Apple Wallet" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Save to Google Wallet" }) as HTMLButtonElement).disabled).toBe(true);
});

test.each(["samsung-m70h-tv", "another-customer-reward"])("normal account cannot obtain sample or other customer's reward via URL: %s", async reward => {
  mocks.account.mockResolvedValue({ activity: drawerState(true), wallet });
  render(await WalletPage({ searchParams: Promise.resolve({ reward }) }));
  expect(screen.getByText("Reward unavailable")).toBeTruthy();
  expect(screen.queryByText('Samsung 50" M70H Mini LED 4K Smart TV')).toBeNull();
  expect(screen.queryByText("$400")).toBeNull();
});

test.each(["playstation-5-slim", "missing", ["nike-court-shot-shoes", "missing"]])("unsupported or malformed selection fails closed: %s", async reward => {
  render(await WalletPage({ searchParams: Promise.resolve({ reward }) }));
  expect(screen.getByText("Reward unavailable")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Reward redemption details" })).toBeNull();
});

test("normal empty and failed-read states are distinct and do not load sample rewards", async () => {
  mocks.account.mockResolvedValue({ activity: drawerState(true), wallet });
  const { rerender } = render(await WalletPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText("No ready gift cards yet")).toBeTruthy();
  mocks.account.mockResolvedValue({ activity: drawerState(false), wallet: null });
  rerender(await WalletPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText(/Rewards unavailable/)).toBeTruthy();
  expect(screen.queryByText("No ready gift cards yet")).toBeNull();
  expect(screen.queryByText("Nike Men's Court Shot Shoes")).toBeNull();
});

test("history link opens authoritative balance and existing history directly; failed balance remains unavailable", async () => {
  const { rerender } = render(await WalletPage({ searchParams: Promise.resolve({ view: "history" }) }));
  expect(screen.getByTestId("wallet-balance").textContent).toBe("$0.00");
  expect(screen.getByText("No transactions yet")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe("#add-funds");
  expect((screen.getByRole("button", { name: "Add funds unavailable" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("link", { name: "Funds & history" }).getAttribute("aria-current")).toBe("page");
  mocks.account.mockResolvedValue({ activity: drawerState(false), wallet: null });
  rerender(await WalletPage({ searchParams: Promise.resolve({ view: "history" }) }));
  expect(screen.getByTestId("wallet-balance").textContent).toBe("Unavailable");
  expect(screen.queryByText("$0.00")).toBeNull();
});

test("card view is a direct wallet destination and fails closed outside preview funding", async () => {
  render(await WalletPage({ searchParams: Promise.resolve({ view: "card" }) }));
  expect(screen.getByRole("heading", { name: "Add a card" })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Save card" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("link", { name: "Back to wallet" }).getAttribute("href")).toBe("/account/wallet?view=history#add-funds");
});

test("anonymous reward request redirects to sign-in before displaying account data", async () => {
  mocks.account.mockResolvedValue(null);
  await expect(WalletPage({ searchParams: Promise.resolve({ reward: "nike-court-shot-shoes" }) })).rejects.toThrow("redirect:/login");
});
