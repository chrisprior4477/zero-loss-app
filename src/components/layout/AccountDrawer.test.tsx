import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
const { path } = vi.hoisted(() => ({ path: { value: "/account" } }));
vi.mock("next/navigation", () => ({ usePathname: () => path.value }));
vi.mock("@/lib/auth/actions", () => ({ signOutAction: vi.fn() }));
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
afterEach(() => { cleanup(); path.value = "/account"; });

test("normal drawer has saved photo, zero balance, no fixtures and disabled funding", () => {
  render(<AccountDrawer {...props} />);
  expect(screen.getByLabelText("Open account menu").querySelector("img")?.getAttribute("src")).toBe("/saved-photo.webp");
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText("No activity yet.", { exact: false })).toBeTruthy();
  expect(dialog.queryByText("PRIZE READY")).toBeNull();
  expect(dialog.getByTestId("drawer-balance").textContent).toBe("$0.00");
  expect((dialog.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  expect(dialog.getByRole("link", { name: "Open Chris Prior's account" }).getAttribute("href")).toBe("/account/profile");
  expect(dialog.getByRole("link", { name: "Open Account Dashboard" }).getAttribute("href")).toBe("/account");
  expect(dialog.getByRole("link", { name: "Official Rules & Free Entry" })).toBeTruthy();
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
test("authorized activity uses the ordinary drawer without global preview framing", () => {
  path.value = "/account/entries";
  render(<AccountDrawer {...props} activityState={storedActivity} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.queryByText("Interactive MVP Preview")).toBeNull();
  expect(dialog.getByRole("link", { name: "1 active entry" })).toBeTruthy();
  expect(dialog.getByText("PlayStation 5 Slim Model").closest("a")?.getAttribute("href")).toContain("/account/entries?item=");
  expect(dialog.getByRole("link", { name: "1 active entry" }).getAttribute("href")).toBe("/account/entries?filter=active");
  expect(dialog.getByTestId("drawer-balance").textContent).toBe("$0.00");
  expect(dialog.queryByText("$24.00")).toBeNull();
});

test("whole activity row navigates and closes drawer; profile name retains casing", () => {
  render(<AccountDrawer {...props} displayName="de la Cruz" activityState={storedActivity} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("link", { name: "Open de la Cruz's account" })).toBeTruthy();
  fireEvent.click(screen.getByText("PlayStation 5 Slim Model"));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("ready prize and compact wallet shortcut close the drawer and go directly to their destinations", () => {
  render(<AccountDrawer {...props} activityState={storedActivity} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const prize = screen.getByRole("link", { name: /Nike Men's Court Shot Shoes/ });
  expect(prize.getAttribute("href")).toBe("/account/wallet?reward=nike-court-shot-shoes");
  fireEvent.click(prize);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const wallet = screen.getByRole("link", { name: "Prize Ready — 1 reward" });
  expect(wallet.getAttribute("href")).toBe("/account/wallet?reward=nike-court-shot-shoes");
  expect(screen.getByRole("link", { name: /Wallet & Transactions/ }).getAttribute("href")).toBe("/account/wallet?view=history");
  fireEvent.click(wallet);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("compact drawer summaries retain direct actions without global simulation labels", () => {
  render(<AccountDrawer {...props} activityState={storedActivity} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const balance = within(screen.getByRole("article", { name: "Playable Wallet" }));
  expect(balance.getByTestId("drawer-balance").textContent).toBe("$0.00");
  expect(balance.queryByText("Funding is not enabled yet.")).toBeNull();
  expect(balance.queryByRole("link", { name: /Transactions/ })).toBeNull();
  expect((balance.getByRole("button", { name: "Add funds" }) as HTMLButtonElement).disabled).toBe(true);
  const wallet = within(screen.getByRole("link", { name: "Prize Ready — 1 reward" }));
  expect(wallet.queryByText("Dick's Sporting Goods")).toBeNull();
  expect(wallet.getByText("1 ready")).toBeTruthy();
  expect(wallet.getByText("Show barcode")).toBeTruthy();
  expect(wallet.queryByText("Sample · Not redeemable")).toBeNull();
  expect(screen.getByRole("link", { name: /Wallet & Transactions/ }).getAttribute("href")).toBe("/account/wallet?view=history");
});

test("drawer account destinations follow the approved hierarchy", () => {
  render(<AccountDrawer {...props} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const navigation = within(screen.getByRole("navigation", { name: "Account navigation" }));
  expect(navigation.getAllByRole("link").map(link => link.textContent?.replace("›", "").trim())).toEqual([
    "My Rewards", "My Zero Loss", "Wallet & TransactionsHistory", "Orders & Fulfillment", "Notifications", "Account & Security",
  ]);
});
