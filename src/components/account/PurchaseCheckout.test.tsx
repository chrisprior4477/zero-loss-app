import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ActivityItem } from "@/lib/account/activity";
const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), fund: vi.fn(), purchase: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("@/lib/account/bulk-purchase-actions", () => ({ completeDemoPurchaseOptions: mocks.purchase }));
vi.mock("@/lib/account/purchase-funding-actions", () => ({ fundPurchaseWallet: mocks.fund }));
import { PurchaseCheckout } from "./PurchaseCheckout";
import { purchaseSelectionKey } from "@/lib/wallet/wallet-funding-context";
const options: ActivityItem[] = Array.from({ length: 3 }, (_, i) => ({ entryId: `entry-${i}`, completionOptionId: `option-${i}`, slug: "nintendo-switch", title: "Nintendo Switch", retailer: "Best Buy", image: "/catalog/nintendo-switch-oled.jpg", status: "completion", rewardKind: "digital", priceCents: 40000, paidCents: 100, remainingCents: 39900, availability: "Available", completionExpiresAt: "2026-11-28T17:00:00Z" }));
function setup(balance = 13900, blocked = false) { return render(<PurchaseCheckout ownerId="account-a" options={options} initialBalance={balance} cards={[{ token: "demo_card_5556", lastFour: "5556", isDefault: true }]} fundingAvailable fundingBlocked={blocked} />); }
function fundPopup() { fireEvent.click(screen.getByRole("button", { name: "Add $260 to continue" })); return within(screen.getByRole("dialog")); }
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); sessionStorage.clear(); window.history.replaceState(null, "", "/"); });
test("a single purchase option has a singular decline link", () => {
  render(<PurchaseCheckout ownerId="account-a" options={[options[0]]} initialBalance={13900} cards={[]} fundingAvailable />);
  expect(screen.getByRole("link", { name: "Decline this offer" }).getAttribute("href")).toContain("decline=confirm");
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
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Review $798 purchase" })); fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
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
  fireEvent.click(screen.getByRole("button", { name: `Review $${quantity * 24} purchase` }));
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
  vi.useFakeTimers(); setup(50000); fireEvent.click(screen.getByRole("button", { name: "Review $399 purchase" })); fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.queryByRole("dialog")).toBeNull(); fireEvent.click(screen.getByRole("button", { name: "Review $399 purchase" })); act(() => vi.advanceTimersByTime(30001));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(mocks.purchase).not.toHaveBeenCalled(); expect(mocks.fund).not.toHaveBeenCalled();
});
test("uncertain funding is locked for recovery rather than submitting a second deposit", async () => {
  mocks.fund.mockResolvedValue({ status: "pending", message: "Check this deposit." }); setup(); const popup = fundPopup();
  fireEvent.click(popup.getByRole("checkbox")); fireEvent.click(popup.getByRole("button", { name: "Add $260 to wallet" }));
  await screen.findByText("Check this deposit."); fireEvent.click(screen.getByRole("button", { name: "Add $260 to wallet" }));
  expect(mocks.fund).toHaveBeenCalledOnce(); expect(mocks.purchase).not.toHaveBeenCalled(); expect(screen.getByRole("link", { name: "Check deposits" })).toBeTruthy();
});
test("pre-existing unresolved deposits prevent a new deposit", () => {
  setup(13900, true); const popup = fundPopup(); fireEvent.click(popup.getByRole("checkbox")); fireEvent.click(popup.getByRole("button", { name: "Add $260 to wallet" })); expect(mocks.fund).not.toHaveBeenCalled();
});
test("uses the returned ledger balance even if another action changed it during funding", async () => {
  mocks.fund.mockResolvedValue({ status: "succeeded", balanceCents: 39800 }); setup(); const popup = fundPopup(); fireEvent.click(popup.getByRole("checkbox")); fireEvent.click(popup.getByRole("button", { name: "Add $260 to wallet" }));
  await screen.findByRole("button", { name: "Add $1 to continue" }); expect(screen.queryByRole("dialog")).toBeNull(); expect(mocks.purchase).not.toHaveBeenCalled();
});
test("the funded and unfunded instructions match the next step and the four actions stay inside the ticket", () => {
  const view = setup(50000);
  const ticket = screen.getByRole("region", { name: "Your purchase options" });
  expect(within(ticket).getByText("Review and confirm your purchase in the popup.")).toBeTruthy();
  expect(within(ticket).getByRole("link", { name: "Go to My Activity" })).toBeTruthy();
  expect(within(ticket).getByRole("link", { name: "Decline all offers" })).toBeTruthy();
  expect(within(ticket).getByRole("link", { name: "Continue shopping" })).toBeTruthy();
  expect(within(ticket).getByRole("button", { name: "Share" })).toBeTruthy();
  view.unmount(); setup(0);
  expect(screen.getByText("Choose a card in the popup. Confirm purchase separately.")).toBeTruthy();
});
test("returning from the wallet restores selected options and the keep-for-later choice", async () => {
  window.history.replaceState(null, "", "/account/purchase-options/nintendo-switch?option=ent_11111111111111111111111111111111&resume=wallet");
  sessionStorage.setItem(purchaseSelectionKey, JSON.stringify({ slug: "nintendo-switch", selected: ["option-0", "option-2"], decline: false }));
  setup(100000);
  await waitFor(() => expect(screen.getByRole("button", { name: "Review $798 purchase" })).toBeTruthy());
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  cleanup(); setup(100000);
  expect(screen.getByRole("button", { name: "Review $798 purchase" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
});

test.each(["close", "Escape", "backdrop", "refresh"])("dismissing Choose options via %s discards only the open edits", dismiss => {
  const checkout = () => render(<PurchaseCheckout ownerId="account-a" initiallySelectedEntryId="entry-2"
    options={options} initialBalance={4300} cards={[]} fundingAvailable />);
  const open = () => fireEvent.click(screen.getByRole("button", { name: /Choose options/ }));
  const option = (number: number) => screen.getByRole("button", { name: `Option ${number}` });
  checkout();
  open();
  fireEvent.click(option(2));
  expect(option(2).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "Add $356 to continue" })).toBeTruthy();
  if (dismiss === "close") fireEvent.click(screen.getByRole("button", { name: "Close purchase popup" }));
  if (dismiss === "Escape") fireEvent.keyDown(document, { key: "Escape" });
  if (dismiss === "backdrop") fireEvent.click(screen.getByRole("dialog").parentElement!);
  if (dismiss === "refresh") { cleanup(); checkout(); }

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Choose options · 1" })).toBeTruthy();
  open();
  expect(option(3).getAttribute("aria-pressed")).toBe("true");
  expect(option(2).getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(option(2));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  expect(screen.getByRole("button", { name: "Add $755 to continue" })).toBeTruthy();
  expect(mocks.fund).not.toHaveBeenCalled();
  expect(mocks.purchase).not.toHaveBeenCalled();
});

test.each([true, false])("refresh restores the exact offers and decline=%s, without submitting checkout", async decline => {
  mocks.purchase.mockResolvedValue({ status: "succeeded", href: "/account/entries?filter=completed" });
  setup(200000);
  fireEvent.click(screen.getByRole("button", { name: /Choose options/ }));
  fireEvent.click(screen.getByRole("button", { name: "Option 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  fireEvent.click(screen.getByRole("button", { name: decline ? /Decline & remove/ : /Keep for later/ }));
  fireEvent.click(screen.getByRole("button", { name: "Review $798 purchase" }));
  cleanup(); setup(200000);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.purchase).not.toHaveBeenCalled();
  expect(mocks.fund).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: decline ? /Decline & remove/ : /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Review $798 purchase" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
  await waitFor(() => expect(mocks.purchase).toHaveBeenCalledOnce());
  expect(mocks.purchase.mock.calls[0][0]).toMatchObject({ purchaseIds: ["option-0", "option-2"], declineIds: decline ? ["option-1"] : [] });
  cleanup(); setup(200000);
  expect(screen.getByRole("button", { name: "Review $399 purchase" })).toBeTruthy();
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
  fireEvent.click(screen.getByRole("button", { name: "Review $399 purchase" }));
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
  fireEvent.click(screen.getByRole("button", { name: /Choose options/ }));
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
