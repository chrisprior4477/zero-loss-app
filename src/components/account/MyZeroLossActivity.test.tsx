import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { drawerState } from "@/lib/account/drawer-state";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { activityFilter, activityHref, activityPresentation, filterActivity } from "@/lib/account/activity";
import { MyZeroLossActivity } from "./MyZeroLossActivity";
import { DashboardActivity } from "./DashboardActivity";
import { ActivitySelection } from "./ActivitySelection";
const { replace, redirect } = vi.hoisted(() => ({ replace: vi.fn(), redirect: vi.fn((href: string) => { throw new Error(`redirect:${href}`); }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), redirect }));
vi.mock("next/image", () => ({ default: () => <span /> }));
beforeEach(() => {
  replace.mockClear();
  // jsdom does not implement the browser's native modal behavior.
  // Focus containment and background inertness are also verified in the browser.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); document.body.style.overflow = ""; });

test("normal empty state cannot expose a fixture by selected slug or filter", () => {
  render(<MyZeroLossActivity state={drawerState(true)} filter="all" selectedSlug="nike-court-shot-shoes" />);
  expect(screen.getByText("Your next choice starts here")).toBeTruthy();
  expect(screen.queryByText("Nike Men's Court Shot Shoes")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
});
test("same activity source yields matching still-open count and full-row links", () => {
  const state = storedActivityFixture();
  expect(filterActivity(state.activity, "active")).toHaveLength(state.activeCount!);
  render(<MyZeroLossActivity state={state} filter="active" />);
  expect(screen.getByText("PlayStation 5 Slim Model").closest("a")?.getAttribute("href")).toContain("item=playstation-5-slim");
  expect(screen.queryByText("Baby's Essentials Bundle")).toBeNull();
  expect(activityFilter("demo=true")).toBe("all");
});
test("completion displays exact product math, optional terms, no operative purchase control", () => {
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="completion" selectedSlug="babys-essentials-bundle" />);
  expect(screen.getByText("$100")).toBeTruthy();
  expect(screen.getByText("$99")).toBeTruthy();
  expect(screen.getByText("$1")).toBeTruthy();
  expect(screen.getByText(/Not wallet cash/)).toBeTruthy();
  expect((screen.getByRole("button", { name: /Complete purchase — not enabled/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("dialog", { name: "Baby's Essentials Bundle" })).toBeTruthy();
  expect(screen.queryByText("Result Ready")).toBeNull();
});
test("prize action respects reward format and old URLs redirect straight to the wallet", () => {
  const prize = storedActivityFixture().activity[1];
  expect(activityPresentation(prize).action).toBe("View Gift Card");
  expect(activityPresentation({ ...prize, rewardKind: "physical" }).action).toBe("Claim Prize");
  expect(activityHref(prize)).toBe("/account/wallet?reward=samsung-m70h-tv");
  expect(() => ActivitySelection({ state: storedActivityFixture(), selectedSlug: prize.slug, destination: "/account" })).toThrow("redirect:/account/wallet?reward=samsung-m70h-tv");
});

test("Dashboard gives authorized samples full-row local detail links without duplicating a balance", () => {
  render(<DashboardActivity state={storedActivityFixture()} />);
  const rows = document.querySelectorAll("a[data-activity-slug]");
  expect(rows).toHaveLength(4);
  for (const row of rows) {
    const slug = (row as HTMLElement).dataset.activitySlug;
    expect(row.getAttribute("href")).toBe(slug === "samsung-m70h-tv" ? `/account/wallet?reward=${slug}` : `/account?item=${slug}`);
  }
  expect(screen.getByRole("link", { name: /View all My Zero Loss/ }).getAttribute("href")).toBe("/account/entries");
  expect(screen.queryByText(/Playable balance/i)).toBeNull();
  expect(screen.queryByText(/Sample activity for visual review/)).toBeNull();
});

test("Dashboard normal and failed-read states never borrow preview data", () => {
  const { rerender } = render(<DashboardActivity state={drawerState(true)} selectedSlug="playstation-5-slim" />);
  expect(screen.getByText("Your next choice starts here")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.querySelectorAll("a[data-activity-slug]")).toHaveLength(0);
  rerender(<DashboardActivity state={drawerState(false)} selectedSlug="babys-essentials-bundle" />);
  expect(screen.getByText("Activity unavailable")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("Dashboard recent activity stays bounded with a full-list destination", () => {
  const state = storedActivityFixture();
  state.activity.push({ ...state.activity[0], slug: "fifth-item", title: "Fifth product" });
  render(<DashboardActivity state={state} />);
  expect(document.querySelectorAll("a[data-activity-slug]")).toHaveLength(4);
  expect(screen.queryByText("Fifth product")).toBeNull();
});

test("detail close and Escape preserve the originating route and filter", () => {
  const { rerender } = render(<MyZeroLossActivity state={storedActivityFixture()} filter="completion" selectedSlug="babys-essentials-bundle" />);
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close activity details" }));
  fireEvent.click(screen.getByRole("button", { name: "Close activity details" }));
  expect(replace).toHaveBeenLastCalledWith("/account/entries?filter=completion", { scroll: false });
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: false, cancelable: true }));
  expect(replace).toHaveBeenLastCalledWith("/account/entries?filter=completion", { scroll: false });
  rerender(<DashboardActivity state={storedActivityFixture()} selectedSlug="playstation-5-slim" />);
  fireEvent.click(screen.getByRole("button", { name: "Close activity details" }));
  expect(replace).toHaveBeenLastCalledWith("/account", { scroll: false });
});

test("closing details restores scroll and focuses the originating product row", () => {
  const state = storedActivityFixture();
  const { rerender } = render(<DashboardActivity state={state} />);
  const opener = screen.getByText("PlayStation 5 Slim Model").closest("a")!;
  opener.focus();
  document.body.style.overflow = "auto";
  rerender(<DashboardActivity state={state} selectedSlug="playstation-5-slim" />);
  expect(document.body.style.overflow).toBe("hidden");
  const buttons = within(screen.getByRole("dialog")).getAllByRole("button");
  expect(buttons.filter(button => !(button as HTMLButtonElement).disabled)).toHaveLength(1);
  rerender(<DashboardActivity state={state} />);
  expect(document.body.style.overflow).toBe("auto");
  expect(document.activeElement).toBe(opener);
});

test("Tab and Shift+Tab wrap between close and keyboard-scrollable detail content", () => {
  render(<DashboardActivity state={storedActivityFixture()} selectedSlug="playstation-5-slim" />);
  const close = screen.getByRole("button", { name: "Close activity details" });
  const content = screen.getByRole("region", { name: "Product details" });
  close.focus();
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(content);
  fireEvent.keyDown(content, { key: "Tab" });
  expect(document.activeElement).toBe(close);
});

test("desktop gallery retains complete catalog names, purchase math and existing filter counts", () => {
  render(<MyZeroLossActivity state={storedActivityFixture()} filter="all" />);
  const filters = within(screen.getByRole("navigation", { name: "Filter My Zero Loss" }));
  for (const name of ["All4", "Still Open1", "You Won1", "Complete Purchase2", "Completed0"]) {
    expect(filters.getByRole("link", { name })).toBeTruthy();
  }
  const gallery = document.querySelector("[data-activity-gallery]");
  expect(gallery?.classList.contains("lg:grid-cols-4")).toBe(true);
  expect(gallery?.querySelectorAll("a[data-activity-slug]")).toHaveLength(4);
  const television = screen.getByRole("link", { name: /Samsung 50" M70H Mini LED 4K Smart TV/ });
  expect(within(television).getByText("View Gift Card" )).toBeTruthy();
  const shoes = screen.getByRole("link", { name: /Nike Men's Court Shot Shoes/ });
  expect(within(shoes).getByText("$74 remaining · $1 applied")).toBeTruthy();
  const essentials = screen.getByRole("link", { name: /Baby's Essentials Bundle/ });
  expect(within(essentials).getByText("$99 remaining · $1 applied")).toBeTruthy();
  expect(television.getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv");
});
