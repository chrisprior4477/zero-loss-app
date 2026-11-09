import { expect, test } from "vitest";
import { breadcrumbItems } from "./breadcrumbs";

function trail(path: string, query = "") {
  return breadcrumbItems(path, new URLSearchParams(query));
}

test("home has no duplicate breadcrumb", () => {
  expect(trail("/")).toEqual([]);
});

test("the print breadcrumb retains the selected prize, quantity and safe shopping return", () => {
  const source = "/browse?category=beauty#prize-bath-body-works-25-gift-card";
  const query = new URLSearchParams({ offering: "bath-body-works-25-gift-card", from: source, quantity: "7", name: "Private name", account: "Private reference" });
  const href = breadcrumbItems("/free-entry/print", query)[0].href!;
  const destination = new URL(href, "https://example.test");
  expect(destination.pathname).toBe("/free-entry");
  expect(Object.fromEntries(destination.searchParams)).toEqual({ offering: "bath-body-works-25-gift-card", from: source, quantity: "7" });
  query.set("from", "https://evil.test"); query.set("quantity", "-2");
  expect(breadcrumbItems("/free-entry/print", query)[0].href).toBe("/free-entry?offering=bath-body-works-25-gift-card");
  query.set("offering", "../wallet");
  expect(breadcrumbItems("/free-entry/print", query)[0].href).toBe("/free-entry");
});

test("account destinations lead back through Your Account", () => {
  expect(trail("/account/crew")).toEqual([
    { label: "Your Account", href: "/account/entries" },
    { label: "Your Crew" },
  ]);
  expect(trail("/account/profile")).toEqual([
    { label: "Your Account", href: "/account/entries" },
    { label: "Account & Security", href: "/account/security" },
    { label: "Profile" },
  ]);
  expect(trail("/account/payment-methods")).toEqual([
    { label: "Your Account", href: "/account/entries" },
    { label: "Account & Security", href: "/account/security" },
    { label: "Payment Methods" },
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
  expect(trail("/items/playstation-5-slim", "from=%2Fbrowse%3Fcategory%3Delectronics")).toEqual([
    { label: "Electronics", href: "/browse?category=electronics" },
    { label: "Playstation 5 Slim" },
  ]);
  expect(trail("/contact/product-request").at(-1)).toEqual({ label: "Suggest a Product" });
  expect(trail("/legal").at(-1)).toEqual({ label: "Legal and Safety" });
  expect(trail("/responsible-participation").at(-1)).toEqual({ label: "Responsible Play" });
});
