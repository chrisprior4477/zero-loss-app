import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const { path } = vi.hoisted(() => ({ path: { value: "/account" } }));
vi.mock("next/navigation", () => ({ usePathname: () => path.value }));
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => {
  const imageProps = { ...props };
  delete imageProps.fill;
  delete imageProps.unoptimized;
  // Plain image is deliberate in jsdom; Next image loading is checked in-browser.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...imageProps} alt="" />;
} }));

import { AccountDrawer } from "./AccountDrawer";
import { drawerState } from "@/lib/account/drawer-state";
import type { AccountActivity } from "@/lib/account/activity";

const storedActivity: AccountActivity = {
  isPreview: false,
  activeCount: 1,
  source: "stored",
  activity: [
    { slug: "playstation-5-slim", status: "active", title: "PlayStation 5 Slim Model", retailer: "Best Buy", image: "/ps5.png", rewardKind: "physical", priceCents: 49900, paidCents: 100, remainingCents: 49800, availability: "Open" },
    { slug: "nike-court-shot-shoes", status: "prize", title: "Nike Men's Court Shot Shoes", retailer: "Dick's Sporting Goods", image: "/nike.png", rewardKind: "digital", priceCents: 7500, paidCents: 100, remainingCents: 7400, availability: "Ready" },
    { slug: "babys-essentials-bundle", status: "completion", title: "Baby's Essentials Bundle", retailer: "Walmart", image: "/baby.png", rewardKind: "physical", priceCents: 10000, paidCents: 100, remainingCents: 9900, availability: "Available" },
  ],
};

const props = { isSignedIn: true, displayName: "Chris Prior", email: "owner@example.test", avatarUrl: "/saved-photo.webp", balanceLabel: "$0.00", activityState: drawerState(true) };

afterEach(() => {
  cleanup();
  path.value = "/account";
  window.history.replaceState({}, "", "/");
});

test("signed-in drawer follows the compact account-menu hierarchy", () => {
  render(<AccountDrawer {...props} />);
  expect(screen.getByLabelText("Open account menu").querySelector("img")?.getAttribute("src")).toBe("/saved-photo.webp");
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByRole("link", { name: "Open Chris Prior's account" }).getAttribute("href")).toBe("/account/profile");
  expect(dialog.getByText("Playable Wallet")).toBeTruthy();
  expect(dialog.getByText("Prize Ready")).toBeTruthy();
  expect(dialog.getByText("Purchase Options")).toBeTruthy();
  expect(dialog.getByTestId("drawer-balance").textContent).toBe("$0.00");
  expect((dialog.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  expect(dialog.queryByText("Recent activity")).toBeNull();
  expect(dialog.queryByText("Shop categories")).toBeNull();
  expect(dialog.queryByText("Help, Rules & Policies")).toBeNull();
  expect(dialog.getByRole("button", { name: "Add to Home Screen" })).toBeTruthy();
  expect(dialog.getByRole("button", { name: "Sign out" })).toBeTruthy();
});

test("balance failure displays Unavailable, never an invented zero", () => {
  render(<AccountDrawer {...props} balanceLabel={null} activityState={drawerState(false)} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByTestId("drawer-balance").textContent).toBe("Unavailable");
  expect(screen.queryByText("$0.00")).toBeNull();
});

test("a successfully saved photo immediately updates the menu trigger", () => {
  render(<AccountDrawer {...props} />);
  fireEvent(window, new CustomEvent("zero-loss-avatar-updated", { detail: { photo: "/new-saved-photo.webp" } }));
  expect(screen.getByLabelText("Open account menu").querySelector("img")?.getAttribute("src")).toBe("/new-saved-photo.webp");
});

test("authorized activity populates the three compact shortcuts", () => {
  path.value = "/account/entries";
  render(<AccountDrawer {...props} activityState={storedActivity} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByRole("link", { name: "Prize Ready — 1 reward" }).getAttribute("href")).toBe("/account/wallet?reward=nike-court-shot-shoes");
  const options = dialog.getByRole("link", { name: "Purchase Options — 1 available" });
  expect(options.getAttribute("href")).toBe("/account/entries?filter=completion");
  expect(within(options).getByText("1")).toBeTruthy();
  expect(dialog.getByRole("link", { name: "1 active entry" }).getAttribute("href")).toBe("/account/entries?filter=active");
  expect(dialog.getByRole("link", { name: "My Activity" }).getAttribute("aria-current")).toBe("page");
});

test("profile navigation retains casing and closes the drawer", () => {
  render(<AccountDrawer {...props} displayName="de la Cruz" activityState={storedActivity} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  fireEvent.click(screen.getByRole("link", { name: "Open de la Cruz's account" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("ready prize and wallet shortcuts close the drawer and use their direct destinations", () => {
  render(<AccountDrawer {...props} activityState={storedActivity} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const prize = screen.getByRole("link", { name: "Prize Ready — 1 reward" });
  expect(prize.getAttribute("href")).toBe("/account/wallet?reward=nike-court-shot-shoes");
  fireEvent.click(prize);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("link", { name: "Wallet & Transactions" }).getAttribute("href")).toBe("/account/wallet?view=history");
});

test("drawer account destinations follow the approved hierarchy", () => {
  render(<AccountDrawer {...props} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const navigation = within(screen.getByRole("navigation", { name: "Account navigation" }));
  expect(navigation.getAllByRole("link").map(link => link.textContent?.trim())).toEqual([
    "My Activity", "Gift Cards & Rewards", "Wallet & Transactions", "Orders & Fulfillment", "Your Crew", "Notifications", "Account & Security",
  ]);
});

test("Add to Home Screen closes the drawer and requests the device install flow", () => {
  const installRequest = vi.fn();
  window.addEventListener("zero-loss-request-install", installRequest, { once: true });
  render(<AccountDrawer {...props} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  fireEvent.click(screen.getByRole("button", { name: "Add to Home Screen" }));
  expect(installRequest).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("signed-out business and personal paths and shopping categories remain available", () => {
  render(<AccountDrawer {...props} isSignedIn={false} avatarUrl={null} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("/signup");
  fireEvent.click(screen.getByRole("button", { name: /For business/ }));
  expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("/signup?account=business");
  expect(screen.getByRole("navigation", { name: "Shop categories" })).toBeTruthy();
});

test("Escape closes the drawer and restores body scrolling", () => {
  render(<AccountDrawer {...props} />);
  document.body.style.overflow = "auto";
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("auto");
});

test("wallet history and rewards get distinct active navigation states", () => {
  path.value = "/account/wallet";
  window.history.replaceState({}, "", "/account/wallet?view=history");
  render(<AccountDrawer {...props} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("link", { name: "Wallet & Transactions" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Gift Cards & Rewards" }).hasAttribute("aria-current")).toBe(false);
  fireEvent.keyDown(window, { key: "Escape" });
  window.history.replaceState({}, "", "/account/wallet?reward=nike-court-shot-shoes");
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("link", { name: "Gift Cards & Rewards" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Wallet & Transactions" }).hasAttribute("aria-current")).toBe(false);
});
