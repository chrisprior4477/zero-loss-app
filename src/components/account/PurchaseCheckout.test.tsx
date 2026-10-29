import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ActivityItem } from "@/lib/account/activity";
const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), fund: vi.fn(), purchase: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("@/lib/account/bulk-purchase-actions", () => ({ completeDemoPurchaseOptions: mocks.purchase }));
vi.mock("@/lib/account/purchase-funding-actions", () => ({ fundPurchaseWallet: mocks.fund }));
import { PurchaseCheckout } from "./PurchaseCheckout";
const options: ActivityItem[] = Array.from({ length: 3 }, (_, i) => ({ entryId: `entry-${i}`, completionOptionId: `option-${i}`, slug: "nintendo-switch", title: "Nintendo Switch", retailer: "Best Buy", image: "/catalog/nintendo-switch-oled.jpg", status: "completion", rewardKind: "digital", priceCents: 40000, paidCents: 100, remainingCents: 39900, availability: "Available", completionExpiresAt: "2026-11-28T17:00:00Z" }));
function setup(balance = 13900, blocked = false) { return render(<PurchaseCheckout options={options} initialBalance={balance} cards={[{ token: "demo_card_5556", lastFour: "5556", isDefault: true }]} fundingAvailable fundingBlocked={blocked} />); }
function fundPopup() { fireEvent.click(screen.getByRole("button", { name: "Add $260 to continue" })); return within(screen.getByRole("dialog")); }
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
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
