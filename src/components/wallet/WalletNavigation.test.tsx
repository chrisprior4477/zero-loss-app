import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { drawerState } from "@/lib/account/drawer-state";
import { walletRewards, activityHref } from "@/lib/account/activity";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import { WalletShortcut } from "./WalletShortcut";
import WalletPage from "@/app/account/wallet/page";

const mocks = vi.hoisted(() => ({ account: vi.fn(), redirect: vi.fn((href: string) => { throw new Error(`redirect:${href}`); }) }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/image", () => ({ default: () => <span /> }));
const wallet: WalletSnapshot = { walletAccountId: null, scope: "production", currency: "USD", balanceCents: 0, transactionCount: 0, fundingAvailable: false, entries: [] };
beforeEach(() => { vi.clearAllMocks(); mocks.account.mockResolvedValue({ activity: drawerState(true, true), wallet, previewAuthorized: true }); });
afterEach(cleanup);

test("wallet shortcut count comes only from digital prize activity, not entries or dollars", () => {
  const state = drawerState(true, true);
  expect(walletRewards(state)).toHaveLength(1);
  expect(activityHref(state.activity[1], "/account", "prize")).toBe("/account/wallet?reward=nike-court-shot-shoes");
  const { rerender } = render(<WalletShortcut state={state} />);
  expect(screen.getByRole("link", { name: "Your wallet — 1 sample reward" }).getAttribute("href")).toBe("/account/wallet?reward=nike-court-shot-shoes");
  rerender(<WalletShortcut state={drawerState(false, false)} />);
  expect(screen.getByRole("link", { name: "Your wallet — Reward count unavailable" })).toBeTruthy();
  expect(screen.queryByText("0")).toBeNull();
});

test("wallet collection contains only the authorized reward and its direct local destination", async () => {
  render(await WalletPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText("Nike Men's Court Shot Shoes")).toBeTruthy();
  expect(screen.queryByText("PlayStation 5 Slim Model")).toBeNull();
  expect(screen.getByRole("link", { name: /Open reward/ }).getAttribute("href")).toBe("/account/wallet?reward=nike-court-shot-shoes");
  expect(screen.getByText("Sample · Not redeemable")).toBeTruthy();
});

test("specific reward opens its redemption destination without another dialog or reveal button", async () => {
  render(await WalletPage({ searchParams: Promise.resolve({ reward: "nike-court-shot-shoes" }) }));
  expect(screen.getByRole("region", { name: "Reward redemption details" })).toBeTruthy();
  expect(screen.getByText("Redemption code")).toBeTruthy();
  expect(screen.getByText("Sample — not redeemable")).toBeTruthy();
  expect(screen.getByText(/No gift card or redeemable barcode has been issued/)).toBeTruthy();
  expect(screen.getByText("$75")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test.each(["nike-court-shot-shoes", "another-customer-reward"])("normal account cannot obtain sample or other customer's reward via URL: %s", async reward => {
  mocks.account.mockResolvedValue({ activity: drawerState(false, true), wallet, previewAuthorized: false });
  render(await WalletPage({ searchParams: Promise.resolve({ reward }) }));
  expect(screen.getByText("Reward unavailable")).toBeTruthy();
  expect(screen.queryByText("Nike Men's Court Shot Shoes")).toBeNull();
  expect(screen.queryByText("$75")).toBeNull();
});

test.each(["playstation-5-slim", "missing", ["nike-court-shot-shoes", "missing"]])("unsupported or malformed selection fails closed: %s", async reward => {
  render(await WalletPage({ searchParams: Promise.resolve({ reward }) }));
  expect(screen.getByText("Reward unavailable")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Reward redemption details" })).toBeNull();
});

test("normal empty and failed-read states are distinct and do not load sample rewards", async () => {
  mocks.account.mockResolvedValue({ activity: drawerState(false, true), wallet, previewAuthorized: false });
  const { rerender } = render(await WalletPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText("No ready prizes yet")).toBeTruthy();
  mocks.account.mockResolvedValue({ activity: drawerState(false, false), wallet: null, previewAuthorized: false });
  rerender(await WalletPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText(/Rewards unavailable/)).toBeTruthy();
  expect(screen.queryByText("No ready prizes yet")).toBeNull();
  expect(screen.queryByText("Nike Men's Court Shot Shoes")).toBeNull();
});

test("history link opens authoritative balance and existing history directly; failed balance remains unavailable", async () => {
  const { rerender } = render(await WalletPage({ searchParams: Promise.resolve({ view: "history" }) }));
  expect(screen.getByTestId("wallet-balance").textContent).toBe("$0.00");
  expect(screen.getByText("No transactions yet")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("link", { name: "Funds & history" }).getAttribute("aria-current")).toBe("page");
  mocks.account.mockResolvedValue({ activity: drawerState(true, false), wallet: null, previewAuthorized: true });
  rerender(await WalletPage({ searchParams: Promise.resolve({ view: "history" }) }));
  expect(screen.getByTestId("wallet-balance").textContent).toBe("Unavailable");
  expect(screen.queryByText("$0.00")).toBeNull();
});

test("anonymous reward request redirects to sign-in before displaying account data", async () => {
  mocks.account.mockResolvedValue(null);
  await expect(WalletPage({ searchParams: Promise.resolve({ reward: "nike-court-shot-shoes" }) })).rejects.toThrow("redirect:/login");
});
