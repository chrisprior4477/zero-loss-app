import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import DeclinedOffersPage from "./page";

const mocks = vi.hoisted(() => ({ account: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); }, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => <span data-testid="product-image" /> }));
vi.mock("@/components/account/ReviveOptionButton", () => ({ ReviveOptionButton: ({ expired }: { expired: boolean }) => <button disabled={expired}>Revive</button> }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

test("only signed-in customers can open declined offers", async () => {
  mocks.account.mockResolvedValue(null);
  await expect(DeclinedOffersPage()).rejects.toThrow(/redirect:.*login.*declined-offers/);
});

test("declined entries retain their own credit, original deadline and free revive action", async () => {
  mocks.account.mockResolvedValue({ activity: { source: "stored", activity: [{
    entryId: "ent_one", completionOptionId: "11111111-1111-4111-8111-111111111111", completionOptionStatus: "declined",
    title: "$100 Walmart Gift Card", retailer: "Walmart", image: "/walmart.png",
    priceCents: 10000, paidCents: 100, remainingCents: 9900,
    completionExpiresAt: "2099-01-01T00:00:00.000Z",
  }, {
    entryId: "ent_two", completionOptionStatus: "available", title: "Unrelated purchase option",
  }] } });
  render(await DeclinedOffersPage());
  expect(screen.getByRole("heading", { name: "Changed your mind?" })).toBeTruthy();
  expect(screen.getByText("$100 Walmart Gift Card")).toBeTruthy();
  expect(screen.queryByText("Unrelated purchase option")).toBeNull();
  expect(screen.getByText("$0.00")).toBeTruthy();
  expect(screen.getByText("$99")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Revive" }) as HTMLButtonElement).disabled).toBe(false);
});
