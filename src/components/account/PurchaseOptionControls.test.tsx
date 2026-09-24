import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ActivityItem } from "@/lib/account/activity";
import type { PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";
const mocks = vi.hoisted(() => ({ purchase: vi.fn(), decline: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/account/lifecycle-actions", () => ({ purchaseGiftCard: mocks.purchase, declinePurchaseOption: mocks.decline }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
import { PurchaseOptionControls } from "./PurchaseOptionControls";
const item: ActivityItem & { completionOptionId: string } = {
  entryId: "ent_11111111111111111111111111111111", completionOptionId: "11111111-1111-4111-8111-111111111111",
  slug: "babys-essentials-bundle", title: "Baby's Essentials Bundle", retailer: "Walmart", image: "/sample.png",
  status: "completion", rewardKind: "digital", priceCents: 10000, paidCents: 100, remainingCents: 9900, availability: "Available",
};
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
function openPurchase() {
  render(<PurchaseOptionControls item={item} />);
  fireEvent.click(screen.getByRole("button", { name: "Complete gift-card purchase" }));
}
test("same-page confirmation shows the exact amount and requires a second explicit click", () => {
  openPurchase();
  expect(screen.getByText("$100 Walmart gift card")).toBeTruthy();
  expect(screen.getByText("$99 from your playable wallet")).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Confirm your purchase" }));
  expect(mocks.purchase).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("button", { name: "Confirm $99 purchase" })).toBeNull();
  expect(mocks.purchase).not.toHaveBeenCalled();
});
test("Escape cancels confirmation without submitting", () => {
  openPurchase();
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(screen.getByRole("button", { name: "Complete gift-card purchase" })).toBeTruthy();
  expect(mocks.purchase).not.toHaveBeenCalled();
});
test("duplicate clicks only dispatch once and success opens the exact reward", async () => {
  let finish!: (state: PurchaseOptionActionState) => void;
  mocks.purchase.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  openPurchase();
  const button = screen.getByRole("button", { name: "Confirm $99 purchase" });
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(mocks.purchase).toHaveBeenCalledOnce());
  expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => finish({ status: "succeeded", message: "Saved", href: "/account/wallet?rewardId=22222222-2222-4222-8222-222222222222" }));
  expect(mocks.replace).toHaveBeenCalledWith("/account/wallet?rewardId=22222222-2222-4222-8222-222222222222");
});
test("lost server response blocks new attempts until a full authoritative status reload", async () => {
  mocks.purchase.mockRejectedValue(new Error("connection lost"));
  openPurchase(); fireEvent.click(screen.getByRole("button", { name: "Confirm $99 purchase" }));
  const check = await screen.findByRole("link", { name: "Check purchase status →" });
  expect(check.getAttribute("href")).toBe(`/account/entries?item=${item.slug}&entry=${item.entryId}`);
  expect((screen.getByRole("button", { name: "Confirm $99 purchase" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("may already be saved");
});
test("insufficient balance carries this exact entry into Add funds", async () => {
  mocks.purchase.mockResolvedValue({ status: "error", recovery: "balance", message: "Add funds" });
  openPurchase(); fireEvent.click(screen.getByRole("button", { name: "Confirm $99 purchase" }));
  expect((await screen.findByRole("link", { name: "Add funds →" })).getAttribute("href")).toBe(`/account/wallet?view=history&from=${item.slug}&entry=${item.entryId}#add-funds`);
});
test("declining still requires confirmation and preserves its no-refund explanation", async () => {
  mocks.decline.mockResolvedValue({ status: "succeeded", message: "Declined" });
  render(<PurchaseOptionControls item={item} />);
  fireEvent.click(screen.getByRole("button", { name: "Decline option" }));
  expect(screen.getByText(/original entry will not be refunded/)).toBeTruthy();
  expect(mocks.decline).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm decline" }));
  await waitFor(() => expect(mocks.decline).toHaveBeenCalledOnce());
  expect(mocks.purchase).not.toHaveBeenCalled();
});
