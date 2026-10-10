import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import EntryPage from "./page";

const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  availability: vi.fn(),
  progress: vi.fn(),
  createClient: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  redirect: vi.fn(),
}));

vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/catalog/availability-reader", () => ({ getOfferingAvailability: mocks.availability }));
vi.mock("@/lib/account/activity-progress", () => ({ activityOfferMetrics: mocks.progress }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("@/components/account/EntryPageActions", () => ({ EntryPageActions: () => <div>Entry actions</div> }));

const ids = Array.from({ length: 5 }, (_, index) => `ent_${String(index + 1).repeat(32)}`);
const activity = ids.map((entryId, index) => ({
  entryId,
  enteredAt: new Date(Date.UTC(2026, 9, 8, 20, 20 + index)).toISOString(),
  slug: "playstation-5-slim",
  title: "PlayStation 5 Slim Model",
  retailer: "Best Buy",
  image: "/playstation.png",
  status: "active",
  paidCents: 100,
  priceCents: 50000,
  remainingCents: 49900,
  availability: "open",
}));

beforeEach(() => {
  mocks.account.mockResolvedValue({
    activity: { activity: [...activity].reverse().concat({ ...activity[0], entryId: `ent_${"a".repeat(32)}`, slug: "another-prize" }), source: "stored" },
    wallet: { balanceCents: 10000, scope: "demo" },
    emailConfirmed: true,
    displayName: "Chris",
  });
  mocks.availability.mockResolvedValue({ "playstation-5-slim": { entryPriceCents: 100 } });
  mocks.progress.mockReturnValue({ "playstation-5-slim": { percentFilled: 68, sold: 1327, capacity: 1950, remaining: 623 } });
  mocks.createClient.mockResolvedValue({ rpc: vi.fn(async () => ({ data: [], error: null })) });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("five authorized entries expand into individual tickets and retain exact detail links", async () => {
  const { rerender } = render(await EntryPage({ params: Promise.resolve({ entryId: ids[2] }) }));
  const hero = screen.getByRole("region", { name: "Saved entry and prize pool" });
  expect(within(hero).getByText("◷ No winners yet. We will notify you when the pool is complete.")).toBeTruthy();
  expect(within(hero).getByRole("link", { name: "Jump to your 5 entries for this prize" }).getAttribute("href")).toBe("#saved-entry-rail");
  expect(within(hero).queryByText("Total entered on this prize")).toBeNull();
  expect(within(hero).queryByText("Average people entering per day")).toBeNull();
  expect(screen.getByRole("link", { name: "Return to My Activity" }).getAttribute("href")).toBe(`/account/entries?viewed=${ids[2]}`);
  const rail = screen.getByRole("region", { name: "Your separate entries for PlayStation 5 Slim Model" });
  expect(rail.id).toBe("saved-entry-rail");
  expect(within(rail).getByText("Your five separate entries")).toBeTruthy();
  const compact = within(rail).getByRole("navigation", { name: "Choose an entry for PlayStation 5 Slim Model" });
  expect(within(compact).getAllByRole("link")).toHaveLength(5);
  expect(rail.querySelector("#saved-entry-tickets")?.getAttribute("aria-hidden")).toBe("true");
  fireEvent.click(within(rail).getByRole("button", { name: "See 5 entries" }));
  expect(rail.querySelector("#saved-entry-tickets")?.getAttribute("aria-hidden")).toBe("false");
  expect(within(rail).getByRole("button", { name: "Hide 5 entries" }).getAttribute("aria-expanded")).toBe("true");
  expect(within(compact).getAllByRole("link")).toHaveLength(5);
  const expanded = rail.querySelector("[class*='entryRailChoices']") as HTMLElement;
  const links = within(expanded).getAllByRole("link");
  expect(links.map(link => link.getAttribute("href"))).toEqual(ids.map(id => `/account/entries/${id}?entries=open`));
  expect(links.map((link, index) => link.textContent?.startsWith(`ENTRY${index + 1}`))).toEqual([true, true, true, true, true]);
  expect(within(rail).getByText("#33333333")).toBeTruthy();
  expect(links[2].getAttribute("aria-current")).toBe("page");
  expect(rail.querySelector(`a[href="/account/entries/ent_${"a".repeat(32)}?entries=open"]`)).toBeNull();
  expect(screen.getByRole("region", { name: "Saved entry and prize pool" }).compareDocumentPosition(rail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(rail.compareDocumentPosition(screen.getByRole("heading", { name: /prize pool still has tickets available/ })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("link", { name: "Close entry details and return to My Activity" }).getAttribute("href")).toBe(`/account/entries?viewed=${ids[2]}`);

  fireEvent.pointerDown(document.body);
  expect(within(rail).getByRole("button", { name: "See 5 entries" }).getAttribute("aria-expanded")).toBe("false");
  expect(rail.querySelector("#saved-entry-tickets")?.getAttribute("aria-hidden")).toBe("true");

  fireEvent.click(within(rail).getByRole("button", { name: "See 5 entries" }));
  fireEvent.click(within(rail).getByRole("button", { name: "Close" }));
  expect(within(rail).getByRole("button", { name: "See 5 entries" }).getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(within(rail).getByRole("button", { name: "See 5 entries" }));

  rerender(await EntryPage({ params: Promise.resolve({ entryId: ids[4] }), searchParams: Promise.resolve({ entries: "open" }) }));
  expect(screen.getByText(ids[4])).toBeTruthy();
  expect(within(screen.getByRole("navigation", { name: "Choose an entry for PlayStation 5 Slim Model" })).getAllByRole("link")[4].getAttribute("aria-current")).toBe("page");
  expect(within(document.querySelector("[class*='entryRailChoices']") as HTMLElement).getAllByRole("link")[4].getAttribute("aria-current")).toBe("page");
});

test("an entry outside the signed-in account cannot open through the rail", async () => {
  await expect(EntryPage({ params: Promise.resolve({ entryId: `ent_${"f".repeat(32)}` }) })).rejects.toThrow("NEXT_NOT_FOUND");
  expect(mocks.notFound).toHaveBeenCalledOnce();
});

test("the ticket-style entry section remains visible even for a single saved entry", async () => {
  mocks.account.mockResolvedValueOnce({
    activity: { activity: [activity[0]], source: "stored" },
    wallet: { balanceCents: 10000, scope: "demo" },
    emailConfirmed: true,
    displayName: "Chris",
  });
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[0] }) }));
  const hero = screen.getByRole("region", { name: "Saved entry and prize pool" });
  expect(within(hero).getByRole("link", { name: "Jump to your 1 entry for this prize" }).getAttribute("href")).toBe("#saved-entry-rail");
  expect(within(hero).queryByText("Total entered on this prize")).toBeNull();
  const rail = screen.getByRole("region", { name: "Your separate entries for PlayStation 5 Slim Model" });
  expect(within(rail).getByText("Your saved entry")).toBeTruthy();
  expect(within(rail).getByRole("link", { name: new RegExp(`entry number ${ids[0]}`) }).getAttribute("aria-current")).toBe("page");
  expect(rail.querySelector("#saved-entry-tickets")?.getAttribute("aria-hidden")).toBe("true");
  fireEvent.click(within(rail).getByRole("button", { name: "See 1 entry" }));
  expect(within(rail.querySelector("[class*='entryRailChoices']") as HTMLElement).getByRole("link", { name: new RegExp(`entry number ${ids[0]}`) })).toBeTruthy();
  const compact = within(rail).getByRole("navigation", { name: "Choose an entry for PlayStation 5 Slim Model" });
  expect(within(compact).getByRole("link", { name: new RegExp(`entry number ${ids[0]}`) }).querySelector("i")).toBeNull();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(within(rail).getByRole("button", { name: "See 1 entry" }).getAttribute("aria-expanded")).toBe("false");
});

test("the expanded saved-ticket count follows newly confirmed account records", async () => {
  mocks.account.mockResolvedValueOnce({
    activity: { activity: [activity[0]], source: "stored" },
    wallet: { balanceCents: 10000, scope: "demo" },
    emailConfirmed: true,
    displayName: "Chris",
  });
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[0] }) }));
  expect(screen.getByText("Your saved entry")).toBeTruthy();
  cleanup();
  mocks.account.mockResolvedValueOnce({
    activity: { activity: activity.slice(0, 3), source: "stored" },
    wallet: { balanceCents: 9800, scope: "demo" },
    emailConfirmed: true,
    displayName: "Chris",
  });
  render(await EntryPage({ params: Promise.resolve({ entryId: ids[0] }) }));
  expect(screen.getByText("Your three separate entries")).toBeTruthy();
  expect(screen.getByRole("button", { name: "See 3 entries" })).toBeTruthy();
  const hero = screen.getByRole("region", { name: "Saved entry and prize pool" });
  expect(within(hero).getByRole("link", { name: "Jump to your 3 entries for this prize" }).getAttribute("href")).toBe("#saved-entry-rail");
  expect(within(hero).queryByText("Total entered on this prize")).toBeNull();
});
