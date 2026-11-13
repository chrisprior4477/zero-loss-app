import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import DeclinedOffersPage from "./page";

const mocks = vi.hoisted(() => ({ account: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); }, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => <span data-testid="product-image" /> }));
vi.mock("@/components/account/ReviveOptionButton", () => ({ ReviveOptionButton: ({ ticketLabel }: { ticketLabel: string }) => <button data-review-ticket={ticketLabel}>Revive</button> }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => {
  const query = {
    select: () => query, eq: () => query,
    in: async () => ({ data: [{ completion_option_id: "11111111-1111-4111-8111-111111111111", status: "pending" }], error: null }),
  };
  return { from: () => query, rpc: async () => ({ data: true, error: null }) };
} }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

test("only signed-in customers can open declined offers", async () => {
  mocks.account.mockResolvedValue(null);
  await expect(DeclinedOffersPage({})).rejects.toThrow(/redirect:.*login.*declined-offers/);
});

test("a single declined offer keeps its countdown visible and its reminder in the disclosure", async () => {
  mocks.account.mockResolvedValue({ userId: "owner", emailConfirmed: true, timezone: "America/Los_Angeles", activity: { source: "stored", activity: [{
    entryId: "ent_one", completionOptionId: "11111111-1111-4111-8111-111111111111", completionOptionStatus: "declined",
    slug: "walmart-100-gift-card", title: "$100 Walmart Gift Card", retailer: "Walmart", image: "/walmart.png",
    priceCents: 10000, paidCents: 100, remainingCents: 9900,
    completionExpiresAt: "2099-01-01T00:00:00.000Z",
  }, {
    entryId: "ent_two", completionOptionStatus: "available", title: "Unrelated purchase option",
  }] } });
  render(await DeclinedOffersPage({}));
  expect(screen.getByRole("heading", { name: "If you change your mind" })).toBeTruthy();
  const exits = within(screen.getByRole("navigation", { name: "Declined offers navigation" }));
  expect(exits.getByRole("link", { name: "Return to My Activity" }).getAttribute("href")).toBe("/account/entries");
  expect(exits.getByRole("link", { name: "Continue shopping" }).getAttribute("href")).toBe("/");
  expect(screen.getByText("$100 Walmart Gift Card")).toBeTruthy();
  expect(screen.queryByText("Unrelated purchase option")).toBeNull();
  const group = screen.getByRole("region", { name: "$100 Walmart Gift Card" });
  expect(within(group).getByText(/days left/).closest("details")).toBeNull();
  const details = within(group).getByText("View offer").closest("details")!;
  expect(details.open).toBe(false);
  expect(group.querySelector('[data-layers="0"]')).toBeTruthy();
  details.open = true;
  expect(screen.getByText("$99")).toBeTruthy();
  expect(screen.getByText("Dec 31, 2098, 4:00 PM PST").getAttribute("dateTime")).toBe("2099-01-01T00:00:00.000Z");
  expect((screen.getByRole("button", { name: "Revive" }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole("checkbox", { name: /Please remind me by email/ }) as HTMLInputElement).checked).toBe(true);
});

test("grouped offers show product pictures and retain their own ticket references after a revive", async () => {
  const offer = { completionOptionStatus: "declined", title: "Nintendo Switch – OLED Model", retailer: "Best Buy",
    slug: "nintendo-switch", image: "/catalog/switch.jpg", priceCents: 40000, paidCents: 100, remainingCents: 39900 };
  const entries = ["ent_111111110000aabb", "ent_222222220000aabb", "ent_12345678abcd1234", null];
  const activity = entries.map((entryId, i) => ({ ...offer, entryId, completionOptionId: `11111111-1111-4111-8111-11111111111${i}` }));
  mocks.account.mockResolvedValue({ userId: "owner", activity: { source: "stored", activity } });
  const view = render(await DeclinedOffersPage({}));
  const expected = ["Ticket #ent_111111110000aabb", "Ticket #ent_222222220000aabb", "Ticket #abcd1234", "Offer #11111113"];
  const group = screen.getByRole("region", { name: offer.title });
  expect(within(group).getAllByTestId("product-image")).toHaveLength(5);
  expect(group.querySelector('[data-layers="2"]')).toBeTruthy();
  const details = within(group).getByText("View 4 offers").closest("details")!;
  expect(details.open).toBe(false);
  details.open = true;
  const rows = within(group).getAllByRole("article");
  expect(rows).toHaveLength(expected.length);
  rows.forEach((row, i) => {
    expect(within(row).getByTestId("product-image")).toBeTruthy();
    expect(within(row).getByText(expected[i])).toBeTruthy();
    expect(within(row).getByRole("button", { name: "Revive" }).getAttribute("data-review-ticket")).toBe(expected[i]);
  });
  const updated = [{ ...activity[0], completionOptionStatus: "available" }, ...activity.slice(1)];
  mocks.account.mockResolvedValue({ userId: "owner", activity: { source: "stored", activity: updated } });
  view.rerender(await DeclinedOffersPage({}));
  expect(details.open).toBe(true);
  expect(within(group).getByText("3 declined offers")).toBeTruthy();
  expect(within(group).getAllByRole("article")).toHaveLength(3);
});

test("a saved ticket link opens the group containing that exact offer", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const offer = { completionOptionStatus: "declined", completionOptionId: id, title: "Nintendo Switch", retailer: "Best Buy",
    slug: "nintendo-switch", image: "/catalog/switch.jpg", remainingCents: 39900 };
  mocks.account.mockResolvedValue({ userId: "owner", activity: { source: "stored", activity: [offer, {
    ...offer, completionOptionId: "22222222-2222-4222-8222-222222222222", title: "Another prize", slug: "another-prize",
  }] } });
  window.history.replaceState(null, "", `#declined-offer-${id}`);
  try {
    const view = render(await DeclinedOffersPage({}));
    expect(document.getElementById(`declined-offer-${id}`)?.closest("details")?.open).toBe(true);
    expect(screen.getByRole("region", { name: "Another prize" }).querySelector("details")?.open).toBe(false);
    view.unmount();
  } finally {
    window.history.replaceState(null, "", window.location.pathname);
  }
});

test("the requested offer takes precedence over a stale fragment", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const offer = { completionOptionStatus: "declined", completionOptionId: id, title: "Nintendo Switch",
    retailer: "Best Buy", slug: "nintendo-switch", image: "/catalog/switch.jpg", remainingCents: 39900 };
  mocks.account.mockResolvedValue({ userId: "owner", activity: { source: "stored", activity: [offer, {
    ...offer, completionOptionId: other, title: "Another prize", slug: "another-prize",
  }] } });
  window.history.replaceState(null, "", `#declined-offer-${other}#declined-offer-${id}`);
  try {
    render(await DeclinedOffersPage({ searchParams: Promise.resolve({ offer: id }) }));
    expect(document.getElementById(`declined-offer-${id}`)?.closest("details")?.open).toBe(true);
    expect(document.getElementById(`declined-offer-${other}`)?.closest("details")?.open).toBe(false);
  } finally {
    window.history.replaceState(null, "", window.location.pathname);
  }
});

test("an old declined link lands on a notice with the exact revived purchase option", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const entryId = "ent_11111111111111111111111111111111";
  mocks.account.mockResolvedValue({ userId: "owner", activity: { source: "stored", activity: [{
    slug: "nintendo-switch", entryId, completionOptionId: id, status: "completion", completionOptionStatus: "available",
  }] } });
  render(await DeclinedOffersPage({ searchParams: Promise.resolve({ offer: id }) }));
  const notice = screen.getByRole("status");
  expect(notice.id).toBe(`declined-offer-${id}`);
  expect(within(notice).getByRole("link", { name: /View its current status/ }).getAttribute("href"))
    .toBe(`/account/purchase-options/nintendo-switch?option=${entryId}`);
});
