import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import EntryPage from "./page";
import { prizeNumberForSlug } from "@/lib/catalog/prize-number";

const mocks = vi.hoisted(() => ({
  account: vi.fn(), availability: vi.fn(), progress: vi.fn(), createClient: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  redirect: vi.fn((href: string) => { throw new Error(`NEXT_REDIRECT:${href}`); }),
}));

vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/catalog/availability-reader", () => ({ getOfferingAvailability: mocks.availability }));
vi.mock("@/lib/account/activity-progress", () => ({ activityOfferMetrics: mocks.progress }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => <span role="img" aria-label={alt} data-src={src} /> }));
vi.mock("@/components/account/EntryPageActions", () => ({ EntryPageActions: () => <div>Entry actions</div> }));

const ids = Array.from({ length: 5 }, (_, index) => `ent_${String(index + 1).repeat(32)}`);
const activity = ids.map((entryId, index) => ({
  entryId, enteredAt: new Date(Date.UTC(2026, 9, 8, 20, 20 + index)).toISOString(),
  slug: "playstation-5-slim", title: "PlayStation 5 Slim Model", retailer: "Best Buy", image: "/playstation.png",
  status: "active", paidCents: 100, priceCents: 50000, remainingCents: 49900, availability: "open",
}));

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  mocks.account.mockResolvedValue({
    activity: { activity: [...activity].reverse().concat({ ...activity[0], entryId: `ent_${"a".repeat(32)}`, slug: "another-prize" }), source: "stored" },
    wallet: { balanceCents: 10000, scope: "demo" }, emailConfirmed: true, displayName: "Chris",
  });
  mocks.availability.mockResolvedValue({ "playstation-5-slim": { entryPriceCents: 100 } });
  mocks.progress.mockReturnValue({ "playstation-5-slim": { percentFilled: 68, sold: 1327, capacity: 1950, remaining: 623 } });
  mocks.createClient.mockResolvedValue({ rpc: vi.fn(async () => ({ data: [], error: null })) });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("entry browser reveals pictured entry details and keeps the saved ID copy action", async () => {
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[0] }) }));
  const hero = screen.getByRole("region", { name: "Saved entry and prize pool" });
  expect(within(hero).getByText("◷ No winners yet. We will notify you when the pool is complete.")).toBeTruthy();
  expect(within(hero).getByText(prizeNumberForSlug("playstation-5-slim"))).toBeTruthy();
  const shortcut = within(hero).getByRole("button", { name: "See my 5 entries" });
  expect(shortcut.textContent).toBe("See my5entries");
  fireEvent.click(shortcut);
  fireEvent.click(shortcut);
  expect(scrollIntoView).toHaveBeenCalledTimes(2);
  expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "start", behavior: "auto" });
  expect(screen.getByRole("link", { name: "Go to My Activity" })).toBeTruthy();
  const rail = screen.getByRole("region", { name: "Your separate entries for PlayStation 5 Slim Model" });
  expect(within(rail).getByRole("heading", { name: "Your 5 separate entries" })).toBeTruthy();
  expect(rail.querySelector("[class*='entryRailCount']")?.textContent).toBe("5");
  expect(within(rail).queryByRole("button", { name: "Hide 5 entries" })).toBeNull();
  expect(within(rail).getByRole("article", { name: "Entry 1 of 5" })).toBeTruthy();
  const first = within(rail).getByRole("article", { name: "Entry 1 of 5" });
  expect(within(first).getByRole("img", { name: "PlayStation 5 Slim Model" }).getAttribute("data-src")).toBe("/playstation.png");
  expect(within(first).getByText("$1 entered")).toBeTruthy();
  expect(within(first).getByText("Entry #11111111")).toBeTruthy();
  fireEvent.click(within(first).getByRole("button", { name: `Copy full entry number ${ids[0]}` }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(ids[0]));
  expect(within(first).getByRole("button", { name: `Copied full entry number ${ids[0]}` })).toBeTruthy();
  fireEvent.click(within(rail).getByRole("button", { name: "View entry 3 of 5" }));
  expect(within(rail).queryAllByRole("article")).toHaveLength(1);
  expect(within(rail).getByRole("article", { name: "Entry 3 of 5" })).toBeTruthy();
  expect(rail.querySelector(`a[href*="${"a".repeat(32)}"]`)).toBeNull();
});

test("the count shortcut opens entry one while a direct entry return opens its own ticket", async () => {
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[2] }), searchParams: Promise.resolve({ entries: "first" }) }));
  expect(screen.getByRole("article", { name: "Entry 1 of 5" })).toBeTruthy();
  cleanup();
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[4] }), searchParams: Promise.resolve({ entries: "open" }) }));
  expect(screen.getByRole("article", { name: "Entry 5 of 5" })).toBeTruthy();
  expect(screen.queryByRole("article", { name: "Entry 1 of 5" })).toBeNull();
});

test("an entry outside the signed-in account cannot open through the rail", async () => {
  await expect(EntryPage({ params: Promise.resolve({ entryId: `ent_${"f".repeat(32)}` }) })).rejects.toThrow("NEXT_NOT_FOUND");
  expect(mocks.notFound).toHaveBeenCalledOnce();
});

test("a bookmarked entry opens its own numbered ticket without extra query parameters", async () => {
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[2] }) }));
  expect(screen.getByRole("article", { name: "Entry 3 of 5" })).toBeTruthy();
  expect(screen.queryByRole("article", { name: "Entry 1 of 5" })).toBeNull();
});

test("an unavailable account read offers a full retry instead of falsely reporting a missing entry", async () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.account.mockResolvedValueOnce({ activity: { activity: [], source: "unavailable" }, wallet: null });
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[2] }) }));
  expect(screen.getByRole("heading", { name: "We couldn’t load your entry right now" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Try again" }).getAttribute("href")).toBe(`/account/entries/${ids[2]}`);
  expect(mocks.notFound).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
  expect(mocks.createClient).not.toHaveBeenCalled();
  expect(warning).toHaveBeenCalledOnce();
  warning.mockRestore();
  cleanup();
  // The same URL succeeds once the account data becomes available again.
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[2] }) }));
  expect(screen.getByRole("article", { name: "Entry 3 of 5" })).toBeTruthy();
});

test.each([
  { status: "prize", rewardId: "reward-1", rewardStatus: "ready", target: "/account/wallet?reward=playstation-5-slim&rewardId=reward-1" },
  { status: "completed", rewardId: "reward-2", rewardStatus: "redeemed", target: "/account/wallet?reward=playstation-5-slim&rewardId=reward-2" },
  { status: "completion", completionOptionStatus: "available", target: `/account/entries?item=playstation-5-slim&entry=${ids[2]}` },
  { status: "completed", completionOptionStatus: "expired", target: `/account/entries?item=playstation-5-slim&entry=${ids[2]}` },
  { status: "completed", completionOptionStatus: "declined", target: "/account/declined-offers" },
])("a saved link follows its owned $status / $completionOptionStatus / $rewardStatus result", async ({ target, ...outcome }) => {
  mocks.account.mockResolvedValueOnce({ activity: { activity: [{ ...activity[2], rewardKind: "digital", ...outcome }], source: "stored" } });
  await expect(EntryPage({ params: Promise.resolve({ entryId: ids[2] }) })).rejects.toThrow(`NEXT_REDIRECT:${target}`);
  expect(mocks.redirect).toHaveBeenCalledWith(target);
  expect(mocks.notFound).not.toHaveBeenCalled();
  expect(mocks.createClient).not.toHaveBeenCalled();
});

test("a signed-out saved link returns to that same entry after login", async () => {
  mocks.account.mockResolvedValueOnce(null);
  await expect(EntryPage({ params: Promise.resolve({ entryId: ids[2] }) })).rejects.toThrow("NEXT_REDIRECT:");
  const destination = new URL(mocks.redirect.mock.calls[0][0], "https://navigation.invalid");
  expect(destination.pathname).toBe("/login");
  expect(destination.searchParams.get("next")).toBe(`/account/entries/${ids[2]}`);
  expect(mocks.notFound).not.toHaveBeenCalled();
});

test("malformed IDs are rejected before reading account data", async () => {
  await expect(EntryPage({ params: Promise.resolve({ entryId: "not-an-entry" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  expect(mocks.account).not.toHaveBeenCalled();
});

test("a single saved entry and later count changes keep the same numbered-ticket UI", async () => {
  mocks.account.mockResolvedValueOnce({ activity: { activity: [activity[0]], source: "stored" }, wallet: { balanceCents: 10000, scope: "demo" }, emailConfirmed: true, displayName: "Chris" });
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[0] }) }));
  expect(screen.getByRole("heading", { name: "Your 1 entry" })).toBeTruthy();
  expect(screen.getByRole("article", { name: "Entry 1 of 1" })).toBeTruthy();
  cleanup();
  mocks.account.mockResolvedValueOnce({ activity: { activity: activity.slice(0, 3), source: "stored" }, wallet: { balanceCents: 9800, scope: "demo" }, emailConfirmed: true, displayName: "Chris" });
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[0] }) }));
  expect(screen.getByRole("heading", { name: "Your 3 separate entries" })).toBeTruthy();
  expect(screen.getByRole("article", { name: "Entry 1 of 3" })).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /entry \d of 3/ })).toHaveLength(3);
});
