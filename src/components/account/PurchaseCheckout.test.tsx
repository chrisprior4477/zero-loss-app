import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ActivityItem } from "@/lib/account/activity";
const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), fund: vi.fn(), purchase: vi.fn(), decline: vi.fn(), undo: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("@/lib/account/bulk-purchase-actions", () => ({ completeDemoPurchaseOptions: mocks.purchase }));
vi.mock("@/lib/account/purchase-funding-actions", () => ({ fundPurchaseWallet: mocks.fund }));
vi.mock("@/lib/account/bulk-decline-actions", () => ({ declineAllDemoPurchaseOptions: mocks.decline, undoBulkDemoPurchaseOptions: mocks.undo }));
import { PurchaseCheckout } from "./PurchaseCheckout";
import { PurchaseOptionSummary } from "./PurchaseOptionSummary";
import { TimeZoneProvider } from "./TimeZoneProvider";
import * as requireContext from "@/lib/wallet/wallet-funding-context";
import { purchaseSelectionKey } from "@/lib/wallet/wallet-funding-context";
const options: ActivityItem[] = Array.from({ length: 3 }, (_, i) => ({ entryId: `entry-${i}`, completionOptionId: `option-${i}`, slug: "nintendo-switch", title: "Nintendo Switch", retailer: "Best Buy", image: "/catalog/nintendo-switch-oled.jpg", status: "completion", rewardKind: "digital", priceCents: 40000, paidCents: 100, remainingCents: 39900, availability: "Available", completionExpiresAt: "2026-11-28T17:00:00Z" }));
function setup(balance = 13900, blocked = false) { return render(<PurchaseCheckout ownerId="account-a" options={options} initialBalance={balance} cards={[{ token: "demo_card_5556", lastFour: "5556", isDefault: true }]} fundingAvailable fundingBlocked={blocked} />); }
function fundPopup() { fireEvent.click(screen.getByRole("button", { name: "Add funds: $260 to continue" })); return within(screen.getByRole("dialog")); }
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); sessionStorage.clear(); localStorage.clear(); window.history.replaceState(null, "", "/"); });
function updatedCheckout(balance: number) {
  // Refresh supplies new objects from the server while retaining the client component.
  return <PurchaseCheckout ownerId="account-a" options={options.map(option => ({ ...option }))} initialBalance={balance} cards={[{ token: "demo_card_5556", lastFour: "5556", isDefault: true }]} fundingAvailable />;
}

test.each(["undo", "finish"])("decline just the second offer without buying, then %s", async exit => {
  setup(200000);
  const button = (name: string | RegExp) => screen.getByRole("button", { name });
  expect(screen.queryByRole("button", { name: /Decline selected/ })).toBeNull();
  fireEvent.click(button(/Choose offers to complete/));
  fireEvent.click(button("Option 2")); fireEvent.click(button("Option 1"));
  fireEvent.click(button("Decline selected (1)"));
  const review = within(screen.getByRole("dialog"));
  expect(within(review.getByRole("list", { name: "Decline" })).getByText("Ticket #entry-1")).toBeTruthy();
  expect(within(review.getByRole("list", { name: "Keep available" })).getAllByRole("listitem")).toHaveLength(2);
  fireEvent.click(button("Back to selection"));
  expect(button("Option 2").getAttribute("aria-pressed")).toBe("true");
  expect(button("Option 1").getAttribute("aria-pressed")).toBe("false");
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.click(button(/Choose offers to complete/));
  expect(button("Option 1").getAttribute("aria-pressed")).toBe("true");
  expect(mocks.decline).not.toHaveBeenCalled();
  fireEvent.click(button("Option 2")); fireEvent.click(button("Option 1"));
  fireEvent.click(button("Decline selected (1)"));
  mocks.decline.mockResolvedValue({ status: "succeeded", optionIds: ["option-1"], message: "1 offer declined." });
  fireEvent.click(button("Decline 1 offer"));
  await screen.findByRole("button", { name: "Undo decline" });
  expect(mocks.decline).toHaveBeenCalledExactlyOnceWith("nintendo-switch", ["option-1"]);
  if (exit === "undo") {
    mocks.undo.mockResolvedValue({ status: "succeeded", optionIds: ["option-1"], message: "Restored." });
    fireEvent.click(button("Undo decline"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.undo).toHaveBeenCalledExactlyOnceWith(["option-1"]);
  } else {
    fireEvent.click(button("View remaining offers"));
    expect(mocks.replace).toHaveBeenCalledWith("/account/purchase-options/nintendo-switch");
    expect(mocks.undo).not.toHaveBeenCalled();
  }
  expect(mocks.fund).not.toHaveBeenCalled(); expect(mocks.purchase).not.toHaveBeenCalled();
});

test.each([
  ["2026-11-28T02:30:00Z", "America/Los_Angeles", "Nov 27, 2026, 6:30 PM PST"],
  ["2026-07-15T17:00:00Z", "America/New_York", "Jul 15, 2026, 1:00 PM EDT"],
  ["2026-11-28T17:00:00Z", "Asia/Kolkata", "Nov 28, 2026, 10:30 PM GMT+5:30"],
])("the summary and offer chooser show the same exact account deadline for %s in %s", (deadline, timeZone, label) => {
  const datedOptions = [{ ...options[0], completionExpiresAt: deadline }];
  render(<TimeZoneProvider value={timeZone}>
    <PurchaseOptionSummary options={datedOptions} />
    <PurchaseCheckout ownerId="account-a" options={datedOptions} initialBalance={13900} cards={[]} fundingAvailable />
  </TimeZoneProvider>);
  const summary = screen.getByText(`Available until ${label}`);
  expect(summary.getAttribute("dateTime")).toBe(deadline);
  fireEvent.click(screen.getByRole("button", { name: /Choose offers to complete/ }));
  const exactDeadline = within(screen.getByRole("dialog")).getByText(label);
  expect(exactDeadline.getAttribute("dateTime")).toBe(deadline);
  expect(mocks.fund).not.toHaveBeenCalled();
  expect(mocks.purchase).not.toHaveBeenCalled();
});
test("another tab's funding updates the purchase without losing the exact offer or keep-for-later choice", () => {
  const view = render(updatedCheckout(4300));
  fireEvent.click(screen.getByRole("button", { name: /Keep for later/ }));
  fireEvent.click(screen.getByRole("button", { name: /Choose offers to complete/ }));
  fireEvent.click(screen.getByRole("button", { name: "Option 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Option 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  expect(screen.getByRole("button", { name: "Add funds: $356 to continue" })).toBeTruthy();
  view.rerender(updatedCheckout(54300));
  expect(screen.getByText("Your wallet covers this purchase.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Review purchase: $399" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: /Choose offers to complete/ }));
  expect(screen.getByRole("button", { name: "Option 3" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "Option 1" }).getAttribute("aria-pressed")).toBe("false");
  expect(mocks.fund).not.toHaveBeenCalled(); expect(mocks.purchase).not.toHaveBeenCalled();
});
test("a changed shortfall requires fresh deposit approval", () => {
  const view = setup(); const popup = fundPopup();
  fireEvent.click(popup.getByRole("checkbox"));
  view.rerender(updatedCheckout(20000));
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  expect(screen.getByRole("button", { name: "Add $199 to wallet" }).hasAttribute("disabled")).toBe(true);
  expect(mocks.fund).not.toHaveBeenCalled();
});
test("funding elsewhere closes the unnecessary deposit popup without buying automatically", () => {
  const view = setup(); fundPopup();
  view.rerender(updatedCheckout(54300));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Review purchase: $399" })).toBeTruthy();
  expect(mocks.fund).not.toHaveBeenCalled(); expect(mocks.purchase).not.toHaveBeenCalled();
});
test("spending elsewhere closes an uncovered purchase confirmation before showing the new shortfall", () => {
  const view = setup(54300);
  fireEvent.click(screen.getByRole("button", { name: "Review purchase: $399" }));
  view.rerender(updatedCheckout(4300));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Add funds: $356 to continue" })).toBeTruthy();
  expect(mocks.purchase).not.toHaveBeenCalled();
});
test("a single purchase option opens a singular decline popup over the current ticket", () => {
  render(<PurchaseCheckout ownerId="account-a" options={[options[0]]} initialBalance={13900} cards={[]} fundingAvailable />);
  fireEvent.click(screen.getByRole("button", { name: "Decline this offer" }));
  expect(screen.getByRole("dialog", { name: "Decline offer?" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Decline 1 offer" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep my offer" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.replace).not.toHaveBeenCalled();
});

test("canceling decline keeps the exact purchase choices, quantity and wallet in place", () => {
  setup(200000);
  fireEvent.click(screen.getByRole("radio", { name: "Buying 2" }));
  fireEvent.click(screen.getByRole("button", { name: /Keep for later/ }));
  fireEvent.click(screen.getByRole("button", { name: "Decline all offers" }));
  fireEvent.click(screen.getByRole("button", { name: "Close and keep my offers" }));
  expect(screen.getByRole("button", { name: "Review purchase: $798" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  expect(mocks.replace).not.toHaveBeenCalled();
  expect(mocks.fund).not.toHaveBeenCalled();
  expect(mocks.purchase).not.toHaveBeenCalled();
});

test("an old decline URL opens the compact popup and returns to the same exact offer when canceled", () => {
  render(<PurchaseCheckout ownerId="account-a" options={options} initialBalance={13900} cards={[]} fundingAvailable initiallySelectedEntryId="entry-2" initiallyConfirmDecline />);
  expect(screen.getByRole("dialog", { name: "Decline offers?" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep my offers" }));
  expect(mocks.replace).toHaveBeenCalledWith("/account/purchase-options/nintendo-switch?option=entry-2", { scroll: false });
  expect(screen.queryByRole("dialog")).toBeNull();
});
test("$260 needed + $50 extra funds exactly $310, then requires a separate purchase confirmation", async () => {
  mocks.fund.mockResolvedValue({ status: "succeeded", balanceCents: 44900 });
  mocks.purchase.mockResolvedValue({ status: "succeeded", href: "/account/wallet?rewardId=issued#reward-pass" });
  setup(); const popup = fundPopup();
  fireEvent.click(popup.getByRole("button", { name: "+$50" }));
  expect((popup.getByRole("textbox", { name: "Extra dollars" }) as HTMLInputElement).value).toBe("50");
  expect(popup.getByRole("button", { name: "Add $310 to wallet" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(popup.getByRole("checkbox")); fireEvent.click(popup.getByRole("button", { name: "Add $310 to wallet" }));
  await screen.findByRole("dialog", { name: "Confirm your purchase" });
  const form = mocks.fund.mock.calls[0][0] as FormData;
  expect(form.get("amountCents")).toBe("31000"); expect(form.get("paymentMethod")).toBe("demo_card_5556"); expect(form.get("fundingPolicy")).toBe("funding-confirmation-v1");
  expect(mocks.purchase).not.toHaveBeenCalled();
  expect(within(screen.getByRole("dialog")).getByText("$50")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account/wallet?rewardId=issued#reward-pass"));
  expect(mocks.purchase.mock.calls[0][0]).toMatchObject({ purchaseIds: ["option-0"], declineIds: ["option-1", "option-2"], totalCents: 39900, confirmed: true });
});
test("typing extra money calculates it and rejects decimals, negatives and unsafe amounts without changing their meaning", () => {
  setup(); const popup = fundPopup(); const input = popup.getByRole("textbox", { name: "Extra dollars" });
  fireEvent.change(input, { target: { value: "50" } }); expect(popup.getByRole("button", { name: "Add $310 to wallet" })).toBeTruthy();
  for (const value of ["1.25", "-5", "9007199254740991", "5,050"]) { fireEvent.change(input, { target: { value } }); expect(popup.getByRole("alert").textContent).toContain("whole-dollar"); expect(popup.getByRole("button", { name: "Add funds" }).hasAttribute("disabled")).toBe(true); }
  expect(mocks.fund).not.toHaveBeenCalled();
});
test("Keep for later survives quantity changes and submits no decline IDs", async () => {
  mocks.purchase.mockResolvedValue({ status: "succeeded", href: "/account/entries?filter=completed" });
  setup(200000); fireEvent.click(screen.getByRole("button", { name: /Keep for later/ }));
  fireEvent.click(screen.getByRole("radio", { name: "Buying 3" })); fireEvent.click(screen.getByRole("radio", { name: "Buying 2" }));
  expect(screen.getByRole("button", { name: "Keep for later Accepting 2 Keeping for later 1" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Decline & remove Accepting 2 Declining & removing 1" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Review purchase: $798" })); fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
  await waitFor(() => expect(mocks.purchase).toHaveBeenCalledOnce()); expect(mocks.purchase.mock.calls[0][0].declineIds).toEqual([]); expect(mocks.fund).not.toHaveBeenCalled();
});

test.each([2, 4])("scrolling Buying to %i updates the review and the exact purchase and decline IDs", async quantity => {
  const offers = Array.from({ length: 4 }, (_, i) => ({
    ...options[0], entryId: `entry-${i}`, completionOptionId: `option-${i}`, priceCents: 2500, remainingCents: 2400,
  }));
  mocks.purchase.mockResolvedValue({ status: "succeeded", href: "/account/entries?filter=completed" });
  render(<PurchaseCheckout ownerId="account-a" options={offers} initialBalance={12000} cards={[]} fundingAvailable={false} />);
  const wheel = screen.getByRole("radiogroup", { name: "Buying" });
  fireEvent.scroll(wheel, { target: { scrollTop: (quantity - 1) * 40 } });
  expect((screen.getByRole("radio", { name: `Buying ${quantity}` }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole("heading", { name: `Buy ${quantity} $25 gift cards` })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: `Review purchase: $${quantity * 24}` }));
  const review = within(screen.getByRole("dialog"));
  expect(review.getByText(`${quantity} gift cards`)).toBeTruthy();
  // Late scroll events behind the confirmation must not change the order being reviewed.
  fireEvent.scroll(wheel, { target: { scrollTop: 0 } });
  expect(mocks.purchase).not.toHaveBeenCalled();
  fireEvent.click(review.getByRole("button", { name: "Confirm purchase" }));
  await waitFor(() => expect(mocks.purchase).toHaveBeenCalledOnce());
  const ids = offers.map(offer => offer.completionOptionId);
  expect(mocks.purchase.mock.calls[0][0]).toMatchObject({
    purchaseIds: ids.slice(0, quantity), declineIds: ids.slice(quantity), totalCents: quantity * 2400,
  });
});
test("Undo and the 30-second timeout never submit a purchase", () => {
  vi.useFakeTimers(); setup(50000); fireEvent.click(screen.getByRole("button", { name: "Review purchase: $399" })); fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.queryByRole("dialog")).toBeNull(); fireEvent.click(screen.getByRole("button", { name: "Review purchase: $399" })); act(() => vi.advanceTimersByTime(30001));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(mocks.purchase).not.toHaveBeenCalled(); expect(mocks.fund).not.toHaveBeenCalled();
});
test("uncertain funding is locked for recovery rather than submitting a second deposit", async () => {
  mocks.fund.mockResolvedValue({ status: "pending", message: "Check this deposit." }); setup(); const popup = fundPopup();
  fireEvent.click(popup.getByRole("checkbox")); fireEvent.click(popup.getByRole("button", { name: "Add $260 to wallet" }));
  await screen.findByText("Check this deposit."); fireEvent.click(screen.getByRole("button", { name: "Add $260 to wallet" }));
  expect(mocks.fund).toHaveBeenCalledOnce(); expect(mocks.purchase).not.toHaveBeenCalled(); expect(screen.getByRole("link", { name: "Check this deposit" })).toBeTruthy();
});
test("pre-existing unresolved deposits prevent a new deposit", () => {
  setup(13900, true); const popup = fundPopup(); fireEvent.click(popup.getByRole("checkbox")); fireEvent.click(popup.getByRole("button", { name: "Add $260 to wallet" })); expect(mocks.fund).not.toHaveBeenCalled();
});

test.each(["pending", "lost response"])("%s retains the exact deposit, two selected offers and Keep for later", async outcome => {
  if (outcome === "pending") mocks.fund.mockResolvedValue({ status: "pending", message: "Check this deposit." });
  else mocks.fund.mockRejectedValue(new Error("Connection lost"));
  const offers = options.map((option, i) => ({ ...option, entryId: `ent_${String(i + 1).repeat(32)}` }));
  render(<PurchaseCheckout ownerId="account-a" options={offers} initialBalance={13900} cards={[{ token: "demo_card_5556", lastFour: "5556", isDefault: true }]} fundingAvailable />);
  fireEvent.click(screen.getByRole("button", { name: /Keep for later/ }));
  fireEvent.click(screen.getByRole("button", { name: /Choose offers to complete/ }));
  fireEvent.click(screen.getByRole("button", { name: "Option 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  fireEvent.click(screen.getByRole("button", { name: "Add funds: $659 to continue" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Add $659 to wallet" }));
  const link = await screen.findByRole("link", { name: "Check this deposit" });
  const href = new URL(link.getAttribute("href")!, "https://example.test");
  expect(href.searchParams.get("deposit")).toBe(mocks.fund.mock.calls[0][0].get("idempotencyKey"));
  expect(href.searchParams.get("from")).toBe("nintendo-switch");
  expect(href.searchParams.get("entry")).toBe(offers[0].entryId);
  expect(href.searchParams.get("choice")).toMatch(/^[a-f0-9-]{36}$/);
  expect(href.hash).toBe("#purchase-deposit");
  fireEvent.click(link);
  expect(JSON.parse(sessionStorage.getItem(purchaseSelectionKey)!)).toMatchObject({ selected: ["option-0", "option-2"], decline: false });
  expect(mocks.fund).toHaveBeenCalledOnce(); expect(mocks.purchase).not.toHaveBeenCalled();
});

test("changed offers show a fresh navigation and completed purchases without offering deposit recovery or resubmission", async () => {
  mocks.purchase.mockResolvedValue({ status: "error", recovery: "offers", message: "These offers changed. No new purchases or declines were made." });
  setup(200000);
  fireEvent.click(screen.getByRole("button", { name: /Keep for later/ }));
  fireEvent.click(screen.getByRole("button", { name: "Review purchase: $399" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("link", { name: "Refresh available offers" }).getAttribute("href")).toBe("/account/purchase-options/nintendo-switch");
  expect(screen.getByRole("link", { name: "View completed purchases" }).getAttribute("href")).toBe("/account/entries?filter=completed");
  expect(screen.queryByRole("link", { name: "Check this deposit" })).toBeNull();
  expect(screen.getByRole("button", { name: "Review purchase: $399" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Review purchase: $399" }));
  expect(mocks.purchase).toHaveBeenCalledOnce();
  // A full navigation mounts the server's remaining options and reconciles the saved draft.
  cleanup();
  render(<PurchaseCheckout ownerId="account-a" options={options.slice(1)} initialBalance={160100} cards={[]} fundingAvailable />);
  expect(screen.getByRole("button", { name: "Review updated options" }).hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(mocks.purchase).toHaveBeenCalledOnce();
  expect(mocks.fund).not.toHaveBeenCalled();
});

test.each(["uncertain receipt", "connection lost"])("%s points to completed purchases and keeps checkout locked", async outcome => {
  if (outcome === "connection lost") mocks.purchase.mockRejectedValue(new Error("Lost response"));
  else mocks.purchase.mockResolvedValue({ status: "error", recovery: "check", message: "Check your purchases; they may already be saved." });
  const view = setup(50000);
  fireEvent.click(screen.getByRole("button", { name: "Review purchase: $399" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
  await screen.findByRole("link", { name: "View completed purchases" });
  view.rerender(updatedCheckout(10100));
  expect(screen.queryByRole("link", { name: "Check this deposit" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Refresh available offers" })).toBeNull();
  expect(screen.getByRole("button", { name: "Add funds: $298 to continue" }).hasAttribute("disabled")).toBe(true);
  expect(mocks.purchase).toHaveBeenCalledOnce();
  expect(mocks.fund).not.toHaveBeenCalled();
});
test("uses the returned ledger balance even if another action changed it during funding", async () => {
  mocks.fund.mockResolvedValue({ status: "succeeded", balanceCents: 39800 }); setup(); const popup = fundPopup(); fireEvent.click(popup.getByRole("checkbox")); fireEvent.click(popup.getByRole("button", { name: "Add $260 to wallet" }));
  await screen.findByRole("button", { name: "Add funds: $1 to continue" }); expect(screen.queryByRole("dialog")).toBeNull(); expect(mocks.purchase).not.toHaveBeenCalled();
});
test("the funded and unfunded instructions match the next step and the four actions stay inside the ticket", () => {
  const view = setup(50000);
  const ticket = screen.getByRole("region", { name: "Your purchase options" });
  expect(within(ticket).getByText("Review first. Confirm your purchase next.")).toBeTruthy();
  expect(within(ticket).getByRole("link", { name: "My Activity" })).toBeTruthy();
  expect(within(ticket).getByRole("button", { name: "Decline all offers" })).toBeTruthy();
  expect(within(ticket).getByRole("link", { name: "Continue shopping" })).toBeTruthy();
  expect(within(ticket).getByRole("button", { name: "Share" })).toBeTruthy();
  view.unmount(); setup(0);
  expect(screen.getByText("Add funds first. Confirm your purchase next.")).toBeTruthy();
});
test("returning from the wallet restores selected options and the keep-for-later choice", async () => {
  window.history.replaceState(null, "", "/account/purchase-options/nintendo-switch?option=ent_11111111111111111111111111111111&resume=wallet");
  sessionStorage.setItem(purchaseSelectionKey, JSON.stringify({ slug: "nintendo-switch", selected: ["option-0", "option-2"], decline: false }));
  setup(100000);
  await waitFor(() => expect(screen.getByRole("button", { name: "Review purchase: $798" })).toBeTruthy());
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  cleanup(); setup(100000);
  expect(screen.getByRole("button", { name: "Review purchase: $798" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
});

test("adding a missing card carries the exact selected offers and Keep for later through the wallet", () => {
  const exactOptions = options.map((option, index) => ({ ...option, entryId: `ent_${String(index + 1).repeat(32)}` }));
  const view = render(<PurchaseCheckout ownerId="account-a" options={exactOptions} initialBalance={0} cards={[]} fundingAvailable />);
  fireEvent.click(screen.getByRole("button", { name: /Keep for later/ }));
  fireEvent.click(screen.getByRole("button", { name: /Choose offers to complete/ }));
  fireEvent.click(screen.getByRole("button", { name: "Option 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Option 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Option 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  fireEvent.click(screen.getByRole("button", { name: "Add funds: $798 to continue" }));
  const link = screen.getByRole("link", { name: "Add a card in your wallet" });
  const walletUrl = new URL(link.getAttribute("href")!, window.location.origin);
  expect(walletUrl.searchParams.get("entry")).toBe(exactOptions[1].entryId);
  expect(walletUrl.searchParams.get("panel")).toBe("card");
  expect(walletUrl.hash).toBe("#wallet-add-card");
  link.addEventListener("click", event => event.preventDefault());
  fireEvent.click(link);
  expect(JSON.parse(sessionStorage.getItem(purchaseSelectionKey)!)).toMatchObject({ ownerId: "account-a", selected: ["option-2", "option-1"], decline: false });
  view.unmount();
  window.history.replaceState(null, "", `/account/purchase-options/nintendo-switch?option=${exactOptions[1].entryId}&resume=wallet`);
  render(<PurchaseCheckout ownerId="account-a" options={exactOptions} initiallySelectedEntryId={exactOptions[1].entryId} initialBalance={0} cards={[{token:"demo_card_5556",lastFour:"5556",isDefault:true}]} fundingAvailable />);
  expect(screen.getByRole("button", { name: "Choose offers to complete · 2 selected" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "Add funds: $798 to continue" })).toBeTruthy();
  expect(mocks.fund).not.toHaveBeenCalled();
  expect(mocks.purchase).not.toHaveBeenCalled();
});

test.each(["close", "Escape", "backdrop", "refresh"])("dismissing Choose offers to complete via %s discards only the open edits", dismiss => {
  const checkout = () => render(<PurchaseCheckout ownerId="account-a" initiallySelectedEntryId="entry-2"
    options={options} initialBalance={4300} cards={[]} fundingAvailable />);
  const open = () => fireEvent.click(screen.getByRole("button", { name: /Choose offers to complete/ }));
  const option = (number: number) => screen.getByRole("button", { name: `Option ${number}` });
  checkout();
  open();
  fireEvent.click(option(2));
  expect(option(2).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "Add funds: $356 to continue" })).toBeTruthy();
  if (dismiss === "close") fireEvent.click(screen.getByRole("button", { name: "Close purchase popup" }));
  if (dismiss === "Escape") fireEvent.keyDown(document, { key: "Escape" });
  if (dismiss === "backdrop") fireEvent.click(screen.getByRole("dialog").parentElement!);
  if (dismiss === "refresh") { cleanup(); checkout(); }

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Choose offers to complete · 1 selected" })).toBeTruthy();
  open();
  expect(option(3).getAttribute("aria-pressed")).toBe("true");
  expect(option(2).getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(option(2));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  expect(screen.getByRole("button", { name: "Add funds: $755 to continue" })).toBeTruthy();
  expect(mocks.fund).not.toHaveBeenCalled();
  expect(mocks.purchase).not.toHaveBeenCalled();
});

test.each([true, false])("refresh restores the exact offers and decline=%s, without submitting checkout", async decline => {
  mocks.purchase.mockResolvedValue({ status: "succeeded", href: "/account/entries?filter=completed" });
  setup(200000);
  fireEvent.click(screen.getByRole("button", { name: /Choose offers to complete/ }));
  fireEvent.click(screen.getByRole("button", { name: "Option 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  fireEvent.click(screen.getByRole("button", { name: decline ? /Decline & remove/ : /Keep for later/ }));
  fireEvent.click(screen.getByRole("button", { name: "Review purchase: $798" }));
  cleanup(); setup(200000);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.purchase).not.toHaveBeenCalled();
  expect(mocks.fund).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: decline ? /Decline & remove/ : /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Review purchase: $798" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
  await waitFor(() => expect(mocks.purchase).toHaveBeenCalledOnce());
  expect(mocks.purchase.mock.calls[0][0]).toMatchObject({ purchaseIds: ["option-0", "option-2"], declineIds: decline ? ["option-1"] : [] });
  cleanup(); setup(200000);
  expect(screen.getByRole("button", { name: "Review purchase: $399" })).toBeTruthy();
});

test("changed inventory keeps other offers and requires a fresh review even across another reload", () => {
  setup(200000);
  fireEvent.click(screen.getByRole("radio", { name: "Buying 2" }));
  cleanup();
  const updated = [options[2], options[1], { ...options[0], entryId: "entry-new", completionOptionId: "option-new" }];
  const reopen = () => render(<PurchaseCheckout ownerId="account-a" options={updated} initialBalance={200000} cards={[]} fundingAvailable />);
  reopen(); cleanup(); reopen();
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Review updated options" }));
  expect(screen.getByRole("button", { name: "Option 2" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "Option 3" }).getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Close purchase popup" }));
  fireEvent.click(screen.getByRole("button", { name: "Review updated options" }));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  fireEvent.click(screen.getByRole("button", { name: "Review purchase: $399" }));
  expect(within(screen.getByRole("dialog")).getByText(/Keep 2 offers/)).toBeTruthy();
  expect(mocks.purchase).not.toHaveBeenCalled();
});

test("a different account or an explicit link to a different ticket starts its own selection", () => {
  setup(200000);
  fireEvent.click(screen.getByRole("radio", { name: "Buying 3" }));
  cleanup();
  render(<PurchaseCheckout ownerId="account-b" options={options} initialBalance={200000} cards={[]} fundingAvailable />);
  expect((screen.getByRole("radio", { name: "Buying 1" }) as HTMLInputElement).checked).toBe(true);
  cleanup();
  render(<PurchaseCheckout ownerId="account-a" initiallySelectedEntryId="entry-2" options={options} initialBalance={200000} cards={[]} fundingAvailable />);
  fireEvent.click(screen.getByRole("button", { name: /Choose offers to complete/ }));
  expect(screen.getByRole("button", { name: "Option 3" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "Option 1" }).getAttribute("aria-pressed")).toBe("false");
});

test("a newly available offer is kept until the customer reviews the changed list", () => {
  render(<PurchaseCheckout ownerId="account-a" options={options.slice(0, 2)} initialBalance={200000} cards={[]} fundingAvailable />);
  fireEvent.click(screen.getByRole("radio", { name: "Buying 2" }));
  cleanup(); setup(200000);
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Review updated options" }));
  expect(screen.getByRole("button", { name: "Option 3" }).getAttribute("aria-pressed")).toBe("false");
  expect(screen.queryByRole("button", { name: "Confirm purchase" })).toBeNull();
});


test("a wallet URL restores two exact offers and keep-for-later in a fresh tab, then retains later edits on refresh", () => {
  const { getWalletFundingContext } = requireContext;
  const renderCheckout = (entryId?: string) => render(<PurchaseCheckout ownerId="account-a" initiallySelectedEntryId={entryId} options={options.map((option, i) => ({ ...option, entryId: `ent_${String(i + 1).padStart(32, "0")}` }))} initialBalance={13600} cards={[{ token: "demo_card_5556", lastFour: "5556", isDefault: true }]} fundingAvailable />);
  const view = renderCheckout();
  fireEvent.click(screen.getByRole("radio", { name: "Buying 2" }));
  fireEvent.click(screen.getByRole("button", { name: /Keep for later/ }));
  const href = getWalletFundingContext()?.href;
  const walletParams = new URL(href!, "https://navigation.invalid").searchParams;
  const token = walletParams.get("choice");
  const entry = walletParams.get("entry")!;
  expect(entry).toMatch(/^ent_[a-f0-9]{32}$/);
  expect(token).toMatch(/^[0-9a-f-]{36}$/);
  view.unmount();
  sessionStorage.clear();
  window.history.replaceState(null, "", `/account/purchase-options/nintendo-switch?option=${entry}&resume=wallet&choice=${token}`);
  const returned = renderCheckout(entry);
  expect((screen.getByRole("radio", { name: "Buying 2" }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "Add funds: $662 to continue" })).toBeTruthy();
  fireEvent.click(screen.getByRole("radio", { name: "Buying 3" }));
  returned.unmount();
  renderCheckout(entry);
  expect((screen.getByRole("radio", { name: "Buying 3" }) as HTMLInputElement).checked).toBe(true);
  expect(mocks.purchase).not.toHaveBeenCalled();
});

test.each(["missing", "foreign", "expired"])("a %s wallet snapshot requires review and keeps remaining offers", kind => {
  const token = "11111111-1111-4111-8111-111111111111";
  if (kind === "foreign") localStorage.setItem("zero-loss-purchase-handoff:" + token, JSON.stringify({ ownerId: "another-account", slug: "nintendo-switch", selected: ["option-1"], available: options.map(o => o.completionOptionId), decline: true, savedAt: Date.now() }));
  if (kind === "expired") localStorage.setItem("zero-loss-purchase-handoff:" + token, JSON.stringify({ ownerId: "account-a", slug: "nintendo-switch", selected: ["option-1"], available: options.map(o => o.completionOptionId), decline: true, savedAt: Date.now() - 25 * 3_600_000 }));
  window.history.replaceState(null, "", "/account/purchase-options/nintendo-switch?option=ent_11111111111111111111111111111111&resume=wallet&choice=" + token);
  setup();
  expect(screen.getByRole("button", { name: "Review updated options" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
});
