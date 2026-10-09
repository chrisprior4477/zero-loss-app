import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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

test("five authorized entries share a separate-entry rail and retain exact detail links", async () => {
  const { rerender } = render(await EntryPage({ params: Promise.resolve({ entryId: ids[2] }) }));
  const rail = screen.getByRole("navigation", { name: "Your separate entries for PlayStation 5 Slim Model" });
  expect(within(rail).getByText("Your five separate entries")).toBeTruthy();
  const links = within(rail).getAllByRole("link");
  expect(links.map(link => link.getAttribute("href"))).toEqual(ids.map(id => `/account/entries/${id}`));
  expect(links.map(link => link.textContent)).toEqual(ids.map((id, index) => `Entry ${index + 1}#${id.slice(-8)}`));
  expect(links[2].getAttribute("aria-current")).toBe("page");
  expect(rail.querySelector(`a[href="/account/entries/ent_${"a".repeat(32)}"]`)).toBeNull();
  expect(screen.getByRole("region", { name: "Saved entry and prize pool" }).compareDocumentPosition(rail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(rail.compareDocumentPosition(screen.getByRole("heading", { name: /prize pool still has tickets available/ })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  rerender(await EntryPage({ params: Promise.resolve({ entryId: ids[4] }) }));
  expect(screen.getByText(ids[4])).toBeTruthy();
  expect(within(screen.getByRole("navigation", { name: "Your separate entries for PlayStation 5 Slim Model" })).getAllByRole("link")[4].getAttribute("aria-current")).toBe("page");
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
  const rail = screen.getByRole("navigation", { name: "Your separate entries for PlayStation 5 Slim Model" });
  expect(within(rail).getByText("Your saved entry")).toBeTruthy();
  expect(within(rail).getByRole("link", { name: new RegExp(`entry number ${ids[0]}`) }).getAttribute("aria-current")).toBe("page");
});
