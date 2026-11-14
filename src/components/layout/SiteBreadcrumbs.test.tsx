import { renderToString } from "react-dom/server";
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
  const nav = screen.getByRole("navigation", { name: "Marketplace categories" }).querySelector<HTMLDivElement>("[data-category-rail]")!;
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
  expect(within(menu).getByRole("menuitem", { name: "See all prizes in Ending Soon" }).getAttribute("href"))
    .toBe("/browse?sort=ending-soon");
});


test("keyboard focus can move through a category menu, then dismiss it when leaving the header", () => {
  render(<><DesktopCategoryNav endingSoonItems={[]} /><button>Outside header</button></>);
  const trigger = screen.getByRole("link", { name: "Games & Puzzles" });
  fireEvent.focus(trigger);
  const menu = screen.getByRole("menu", { name: "Games & Puzzles menu" });
  const last = within(menu).getAllByRole("menuitem").at(-1)!;
  fireEvent.blur(trigger, { relatedTarget: last });
  expect(screen.getByRole("menu")).toBeTruthy();
  fireEvent.blur(last, { relatedTarget: screen.getByRole("button", { name: "Outside header" }) });
  expect(screen.queryByRole("menu")).toBeNull();
});

test("product breadcrumbs use the page's canonical catalog name and never carry it onto another product", () => {
  route.pathname = "/items/sony-wh-1000xm5-headphones"; route.query = "from=%2Fbrowse%3Fcategory%3Delectronics";
  const view = render(<><SiteBreadcrumbs /><SiteBreadcrumbs product={{ slug: "sony-wh-1000xm5-headphones", title: "Sony WH-1000XM5 Wireless Headphones" }} /></>);
  expect(screen.getAllByRole("navigation", { name: "Breadcrumb" })).toHaveLength(1);
  expect(screen.getByText("Sony WH-1000XM5 Wireless Headphones").getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Electronics" }).getAttribute("href")).toBe("/browse?category=electronics");
  route.pathname = "/items/playstation-5-slim";
  view.rerender(<><SiteBreadcrumbs /><SiteBreadcrumbs product={{ slug: "playstation-5-slim", title: "PlayStation 5 Slim Model" }} /></>);
  expect(screen.getByText("PlayStation 5 Slim Model")).toBeTruthy();
  expect(screen.queryByText("Sony WH-1000XM5 Wireless Headphones")).toBeNull();
  route.pathname = "/account/wallet"; route.query = "view=history";
  view.rerender(<><SiteBreadcrumbs /><SiteBreadcrumbs product={{ slug: "playstation-5-slim", title: "PlayStation 5 Slim Model" }} /></>);
  expect(screen.getByText("Wallet & Transactions")).toBeTruthy();
  expect(screen.getAllByRole("navigation", { name: "Breadcrumb" })).toHaveLength(1);
});

test("the server's first product breadcrumb contains the canonical name without a client title update", () => {
  route.pathname = "/items/bath-body-works-25-gift-card";
  route.query = "from=%2Fbrowse%3Fcategory%3Dbeauty";
  const html = renderToString(<><SiteBreadcrumbs /><SiteBreadcrumbs product={{ slug: "bath-body-works-25-gift-card", title: "$25 Bath & Body Works Gift Card" }} /></>);
  expect(html).toContain("$25 Bath &amp; Body Works Gift Card");
  expect(html).not.toContain("Bath Body Works 25 Gift Card");
  expect(html.match(/aria-label="Breadcrumb"/g)).toHaveLength(1);
  route.pathname = "/account/wallet"; route.query = "view=history";
});
