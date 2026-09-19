import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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

test("the category rail shows only a small labeled-for-accessibility house before Ending Soon", () => {
  render(<DesktopCategoryNav />);
  const links = within(screen.getByRole("navigation", { name: "Marketplace categories" })).getAllByRole("link");
  expect(links[0].getAttribute("href")).toBe("/");
  expect(links[0].getAttribute("aria-label")).toBe("Home");
  expect(links[0].textContent).toBe("");
  expect(links[1].textContent).toBe("Ending Soon");
});
