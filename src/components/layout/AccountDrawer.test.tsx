import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const { path, push } = vi.hoisted(() => ({ path: { value: "/account", search: "" }, push: vi.fn() }));
vi.mock("@/lib/account/demo-activity-reset-actions", () => ({
  previewAllDemoActivityReset: vi.fn(async () => ({ status: "ready", entryCount: 2, balanceCents: 13600 })),
  resetAllDemoActivity: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => path.value, useSearchParams: () => new URLSearchParams(path.search), useRouter: () => ({ refresh: vi.fn(), push }) }));
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
import { purchaseFundingHref, purchaseSelectionKey, setWalletFundingContext } from "@/lib/wallet/wallet-funding-context";

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
  setWalletFundingContext(null);
  sessionStorage.clear();
  path.value = "/account";
  path.search = "";
  window.history.replaceState({}, "", "/");
  push.mockReset(); vi.useRealTimers();
});

test.each(["page", "query"])("account drawer closes and releases scrolling on %s navigation", kind => {
  const view = render(<AccountDrawer {...props} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("dialog")).toBeTruthy();
  if (kind === "page") path.value = "/account/wallet";
  else path.search = "filter=active";
  view.rerender(<AccountDrawer {...props} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).not.toBe("hidden");
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("dialog")).toBeTruthy();
});

test.each([true, false])("long-pressing the photo=%s trigger opens Profile without opening the drawer", showPhotoInMenu => {
  vi.useFakeTimers();
  render(<AccountDrawer {...props} showPhotoInMenu={showPhotoInMenu} />);
  const trigger = screen.getByLabelText("Open account menu");
  // Supply pointer properties explicitly because jsdom has no native PointerEvent.
  const down = new Event("pointerdown", { bubbles: true });
  Object.assign(down, { button: 0, isPrimary: true, pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent(trigger, down);
  act(() => vi.advanceTimersByTime(600));
  expect(push).toHaveBeenCalledExactlyOnceWith("/account/profile#profile-intro");
  fireEvent.pointerUp(trigger); fireEvent.click(trigger);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent(trigger, down); fireEvent.pointerUp(trigger); fireEvent.click(trigger);
  expect(screen.getByRole("dialog")).toBeTruthy();
});

test("signed-in drawer follows the compact account-menu hierarchy", () => {
  render(<AccountDrawer {...props} />);
  expect(screen.getByLabelText("Open account menu").querySelector("img")?.getAttribute("src")).toBe("/saved-photo.webp");
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByRole("link", { name: "Open Chris Prior's account" }).getAttribute("href")).toBe("/account/profile#profile-intro");
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
  expect(dialog.queryByRole("button", { name: "Reset All Demo Activity" })).toBeNull();
});

test.each(["Add funds", "Playable Wallet: $0.00", "Wallet & Transactions"])("the menu’s %s shortcut carries the exact checkout and choices", label => {
  const slug = "publix-100-gift-card-ending-soon";
  const href = purchaseFundingHref(slug, "ent_11111111111111111111111111111111")!;
  const selection = { href, slug, selected: ["option-2", "option-4"], decline: false };
  path.value = `/account/purchase-options/${slug}`;
  setWalletFundingContext(selection);
  render(<AccountDrawer {...props} fundingEnabled />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const link = screen.getByRole("link", { name: label });
  expect(link.getAttribute("href")).toBe(label === "Add funds" ? href.replace("#balance", "#add-funds") : href);
  fireEvent.click(link);
  expect(JSON.parse(sessionStorage.getItem(purchaseSelectionKey)!)).toEqual(selection);
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("using the menu again inside the wallet keeps the existing purchase return", () => {
  const wallet = "/account/wallet?view=history&from=publix&entry=ent_11111111111111111111111111111111";
  path.value = "/account/wallet";
  window.history.replaceState({}, "", wallet + "#balance");
  render(<AccountDrawer {...props} fundingEnabled />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe(wallet + "#add-funds");
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

test("the photo checkbox changes the round menu button immediately without removing the saved photo", () => {
  render(<AccountDrawer {...props} />);
  fireEvent(window, new CustomEvent("zero-loss-photo-menu-visibility", { detail: { enabled: false } }));
  expect(screen.getByLabelText("Open account menu").querySelector("img")).toBeNull();
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("link", { name: "Open Chris Prior's account" }).querySelector("img")).toBeNull();
  fireEvent(window, new CustomEvent("zero-loss-photo-menu-visibility", { detail: { enabled: true } }));
  expect(screen.getByLabelText("Open account menu").querySelector("img")?.getAttribute("src")).toBe("/saved-photo.webp");
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
  expect(dialog.getByRole("link", { name: "1 active entry" }).getAttribute("href")).toBe("/account/entries?filter=active#my-activity-filters");
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
  expect(navigation.getAllByRole("link").map(link => link.getAttribute("aria-label"))).toEqual([
    "My Gift Cards & Rewards", "My Activity", "Favorites & Sent to You", "Wallet & Transactions", "Orders & Fulfillment", "Your Crew", "Notifications", "Account & Security", "Declined Offers",
  ]);
});

test("approved drawer controls keep their real routes and one mounted dialog", () => {
  render(<AccountDrawer {...props} fundingEnabled activityState={storedActivity} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const dialog = within(screen.getByRole("dialog"));
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  expect(dialog.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe("/account/wallet?view=history#add-funds");
  expect(dialog.getByRole("link", { name: "Open notifications" }).getAttribute("href")).toBe("/account/notifications");
  expect(dialog.getByRole("link", { name: "1 active entry" }).getAttribute("href")).toBe("/account/entries?filter=active#my-activity-filters");
  expect(dialog.getByText("Real prizes. Real possibilities.")).toBeTruthy();
  expect(dialog.getByRole("navigation", { name: "Account navigation" }).querySelectorAll("img")).toHaveLength(9);
  expect(dialog.getByRole("link", { name: "Declined Offers" }).getAttribute("href")).toBe("/account/declined-offers");
  expect(dialog.getByRole("link", { name: "Favorites & Sent to You" }).getAttribute("href")).toBe("/account/favorites");
  expect(dialog.getByRole("link", { name: "Your Crew" }).getAttribute("href")).toBe("/account/crew#crew-intro");
  const controls = dialog.getAllByRole("button").map(button => button.textContent?.trim());
  expect(controls.indexOf("Add to Home Screen")).toBeLessThan(controls.indexOf("Reset All Demo Activity"));
  expect(controls.indexOf("Reset All Demo Activity")).toBeLessThan(controls.indexOf("Sign out"));
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
  expect(screen.getByRole("link", { name: "Favorites & Sent to You" }).getAttribute("href")).toBe("/account/favorites");
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

test("Escape belongs to the nested reset confirmation, then to the account menu", async () => {
  const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
  try {
    render(<AccountDrawer {...props} fundingEnabled />);
    screen.getByLabelText("Open account menu").focus();
    fireEvent.click(screen.getByLabelText("Open account menu"));
    fireEvent.click(screen.getByRole("button", { name: "Reset All Demo Activity" }));
    const confirmation = await screen.findByRole("dialog", { name: "Reset all demo activity?" });
    expect(confirmation.hasAttribute("open")).toBe(true);
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    fireEvent(confirmation, escape);
    // The browser must receive Escape to dispatch the top dialog's cancel event.
    expect(escape.defaultPrevented).toBe(false);
    expect(screen.getByRole("dialog", { name: "Your Zero Loss account menu" })).toBeTruthy();
    fireEvent(confirmation, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog", { name: "Reset all demo activity?" })).toBeNull();
    expect(document.documentElement.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.documentElement.style.overflow).not.toBe("hidden");
    expect(document.activeElement).toBe(screen.getByLabelText("Open account menu"));
  } finally {
    if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShow);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  }
});

test("a child popup that has consumed Escape keeps its account menu open", () => {
  render(<AccountDrawer {...props} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  event.preventDefault();
  fireEvent(window, event);
  expect(screen.getByRole("dialog")).toBeTruthy();
});

test("wallet history and rewards get distinct active navigation states", () => {
  path.value = "/account/wallet";
  window.history.replaceState({}, "", "/account/wallet?view=history");
  render(<AccountDrawer {...props} />);
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("link", { name: "Wallet & Transactions" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "My Gift Cards & Rewards" }).hasAttribute("aria-current")).toBe(false);
  fireEvent.keyDown(window, { key: "Escape" });
  window.history.replaceState({}, "", "/account/wallet?reward=nike-court-shot-shoes");
  fireEvent.click(screen.getByLabelText("Open account menu"));
  expect(screen.getByRole("link", { name: "My Gift Cards & Rewards" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Wallet & Transactions" }).hasAttribute("aria-current")).toBe(false);
});
