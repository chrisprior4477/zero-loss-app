import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { drawerState } from "@/lib/account/drawer-state";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { MyZeroLossSummary, PlayableBalanceCard } from "./AccountSummaries";
import { WalletShortcut } from "@/components/wallet/WalletShortcut";
import AccountPage from "@/app/account/page";
import ProfilePage from "@/app/account/profile/page";

const mocks = vi.hoisted(() => ({ account: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); } }));
vi.mock("next/image", () => ({ default: () => <span data-testid="saved-photo" /> }));
vi.mock("./ProfilePhotoCard", () => ({ ProfilePhotoCard: ({ fullName, initialAvatarUrl }: { fullName: string; initialAvatarUrl: string | null }) => <div data-testid="profile-editor" data-avatar={initialAvatarUrl}>{fullName}</div> }));
afterEach(cleanup);

test("summary shows only authorized activity counts and keeps money independent", () => {
  const state = storedActivityFixture();
  render(<><PlayableBalanceCard balanceLabel="$0.00" /><MyZeroLossSummary state={state} /><WalletShortcut state={state} dashboard /></>);
  expect(screen.getByTestId("dashboard-balance").textContent).toBe("$0.00");
  expect(screen.getByText("4 items")).toBeTruthy();
  expect(screen.getByText("1 open · 1 won · 2 purchase options")).toBeTruthy();
  expect(screen.getByText("1 ready")).toBeTruthy();
  expect(screen.getByText("Show barcode")).toBeTruthy();
  expect(screen.queryByText("Sample · Not redeemable")).toBeNull();
  expect(screen.queryByText("$100.00")).toBeNull();
  expect((screen.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
});

test("normal empty and unavailable summaries never substitute fixtures or invent zeros", () => {
  const { rerender } = render(<><PlayableBalanceCard balanceLabel="$0.00" /><MyZeroLossSummary state={drawerState(true)} /><WalletShortcut state={drawerState(true)} /></>);
  expect(screen.getByText("0 items")).toBeTruthy();
  expect(screen.getByText("0 ready")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Prize Ready — 0 rewards" }).getAttribute("href")).toBe("/account/wallet");
  expect(screen.queryByText("Sample · Not redeemable")).toBeNull();
  rerender(<><PlayableBalanceCard balanceLabel={null} /><MyZeroLossSummary state={drawerState(false)} /><WalletShortcut state={drawerState(false)} /></>);
  expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  expect(screen.queryByText("0 items")).toBeNull();
  expect(screen.queryByText("0 ready")).toBeNull();
  expect(screen.queryByText("$0.00")).toBeNull();
});

test("multiple rewards lead to the collection instead of choosing a reward for the customer", () => {
  const state = storedActivityFixture();
  const reward = state.activity.find(item => item.status === "prize")!;
  render(<WalletShortcut state={{ ...state, activity: [reward, { ...reward, slug: "second-authorized-reward" }] }} />);
  expect(screen.getByRole("link", { name: "Prize Ready — 2 rewards" }).getAttribute("href")).toBe("/account/wallet");
});

test("retired account dashboard redirects to My Activity and preserves a selected item", async () => {
  await expect(AccountPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/account/entries");
  await expect(AccountPage({ searchParams: Promise.resolve({ item: "samsung-m70h-tv" }) })).rejects.toThrow("redirect:/account/entries?item=samsung-m70h-tv");
});

test("profile destination preserves stored name/photo and requires authentication", async () => {
  mocks.account.mockResolvedValue({ displayName: "O’Neill", initials: "O", email: "Customer@example.test", avatarUrl: "/saved-photo.webp", emailConfirmed: true });
  render(await ProfilePage());
  expect(screen.getByTestId("profile-editor").textContent).toBe("O’Neill");
  expect(screen.getByTestId("profile-editor").getAttribute("data-avatar")).toBe("/saved-photo.webp");
  mocks.account.mockResolvedValue(null);
  await expect(ProfilePage()).rejects.toThrow("redirect:/login");
});
