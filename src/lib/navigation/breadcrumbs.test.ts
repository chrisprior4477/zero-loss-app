import { expect, test } from "vitest";
import { breadcrumbItems } from "./breadcrumbs";

function trail(path: string, query = "") {
  return breadcrumbItems(path, new URLSearchParams(query));
}

test("home has no duplicate breadcrumb", () => {
  expect(trail("/")).toEqual([]);
});

test("account destinations lead back through Your Account", () => {
  expect(trail("/account/crew")).toEqual([
    { label: "Your Account", href: "/account/entries" },
    { label: "Your Crew" },
  ]);
  expect(trail("/account/profile")).toEqual([
    { label: "Your Account", href: "/account/entries" },
    { label: "Account & Security", href: "/account/security" },
    { label: "Edit Profile" },
  ]);
});

test("wallet states keep the destination accurate", () => {
  expect(trail("/account/wallet").at(-1)).toEqual({ label: "Gift Cards & Rewards" });
  expect(trail("/account/wallet", "view=history").at(-1)).toEqual({ label: "Wallet & Transactions" });
  expect(trail("/account/wallet", "view=card").at(-1)).toEqual({ label: "Add Card" });
  expect(trail("/account/wallet", "reward=samsung-m70h-tv")).toEqual([
    { label: "Your Account", href: "/account/entries" },
    { label: "Gift Cards & Rewards", href: "/account/wallet" },
    { label: "Reward details" },
  ]);
});

test("marketplace and informational routes have a route back home", () => {
  expect(trail("/browse", "category=gas")).toEqual([
    { label: "Browse the Marketplace", href: "/browse" },
    { label: "Gas" },
  ]);
  expect(trail("/items/playstation-5-slim")).toEqual([
    { label: "Browse the Marketplace", href: "/browse" },
    { label: "Playstation 5 Slim" },
  ]);
  expect(trail("/contact/product-request").at(-1)).toEqual({ label: "Suggest a Product" });
});
