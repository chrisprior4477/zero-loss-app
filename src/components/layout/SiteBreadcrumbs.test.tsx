import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SiteBreadcrumbs } from "./SiteBreadcrumbs";
import { DesktopCategoryNav } from "./DesktopCategoryNav";

const route = vi.hoisted(() => ({ pathname: "/account/wallet", query: "view=history" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useSearchParams: () => new URLSearchParams(route.query),
}));

afterEach(cleanup);

test("the shared account trail has a labeled home exit and the right wallet destination", () => {
  render(<SiteBreadcrumbs />);
  const breadcrumbs = within(screen.getByRole("navigation", { name: "Breadcrumb" }));
  expect(breadcrumbs.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
  expect(breadcrumbs.getByRole("link", { name: "Your Account" }).getAttribute("href")).toBe("/account/entries");
  expect(breadcrumbs.getByText("Wallet & Transactions").getAttribute("aria-current")).toBe("page");
});

test("the category rail shows a small home link, then Ending Soon and All", () => {
  render(<DesktopCategoryNav endingSoonItems={[]} />);
  const links = within(screen.getByRole("navigation", { name: "Marketplace categories" })).getAllByRole("link");
  expect(links[0].getAttribute("href")).toBe("/");
  expect(links[0].getAttribute("aria-label")).toBe("Home");
  expect(links[0].textContent).toBe("");
  expect(links[1].textContent).toBe("Ending Soon");
  expect(links[2].textContent).toBe("All");
  expect(links[2].getAttribute("href")).toBe("/browse");
  expect(screen.queryByRole("button", { name: /Scroll marketplace categories/ })).toBeNull();
});

test("the category rail slides smoothly with a mouse wheel when it overflows", () => {
  render(<DesktopCategoryNav endingSoonItems={[]} />);
  const nav = screen.getByRole("navigation", { name: "Marketplace categories" });
  Object.defineProperties(nav, {
    clientWidth: { configurable: true, value: 600 },
    scrollWidth: { configurable: true, value: 1000 },
  });
  nav.scrollBy = vi.fn();

  fireEvent.wheel(nav, { deltaY: 120 });

  expect(nav.scrollBy).toHaveBeenCalledWith({ left: 120, behavior: "smooth" });
});

test("Ending Soon shows current near-full offers instead of the All menu's saved list", () => {
  render(<DesktopCategoryNav endingSoonItems={[{ title: "Current near-full offer", href: "/items/current-offer?from=%2Fbrowse%3Fsort%3Dending-soon", remaining: 2 }]} />);
  fireEvent.mouseEnter(screen.getByRole("link", { name: "Ending Soon" }));
  const menu = screen.getByRole("menu", { name: "Ending Soon menu" });
  expect(within(menu).getByRole("menuitem", { name: /Current near-full offer/ }).getAttribute("href"))
    .toBe("/items/current-offer?from=%2Fbrowse%3Fsort%3Dending-soon");
  expect(within(menu).queryByText('Samsung 50" M70H Smart TV')).toBeNull();
  expect(within(menu).getByRole("menuitem", { name: "See all Ending Soon" }).getAttribute("href"))
    .toBe("/browse?sort=ending-soon");
});
