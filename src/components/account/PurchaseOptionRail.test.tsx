import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { PurchaseOptionRail } from "./PurchaseOptionRail";

vi.mock("next/image", () => ({ default: () => <span /> }));
const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), decline: vi.fn(), undo: vi.fn(), purchase: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("@/lib/account/bulk-decline-actions", () => ({ declineAllDemoPurchaseOptions: mocks.decline, undoBulkDemoPurchaseOptions: mocks.undo }));
vi.mock("@/lib/account/bulk-purchase-actions", () => ({ completeDemoPurchaseOptions: mocks.purchase }));
afterEach(cleanup);

const bulkOptions = (count = 8) => Array.from({ length: count }, (_, i) => ({ ...storedActivityFixture().activity[2], entryId: `ent_${String(i+1).padStart(32,"0")}`, completionOptionId: `${String(i+1).padStart(8,"0")}-1111-4111-8111-111111111111`, remainingCents: 14900 }));
test("top and lower quantities synchronize, show both number badges and confirm exact choices before saving", async () => {
  const options = bulkOptions();
  render(<PurchaseOptionRail title="Gift card" options={options} canBulkDecline showSummary />);
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "2" } });
  const buttons = screen.getAllByRole("button", { name: "Make 2 purchases, decline 6" });
  expect(buttons).toHaveLength(2);
  expect(within(buttons[0]).getByText("2").className).toContain("quantityBadge");
  expect(within(buttons[0]).getByText("6").className).toContain("quantityBadge");
  expect((screen.getAllByRole("combobox")[1] as HTMLSelectElement).value).toBe("2");
  fireEvent.click(buttons[0]); expect(mocks.purchase).not.toHaveBeenCalled();
  expect(screen.getByRole("group",{name:"Confirm selected purchases"}).textContent).toContain("$298");
  mocks.purchase.mockResolvedValueOnce({ status:"succeeded", purchasedCount:2, declinedCount:6, href:"/account/wallet" });
  fireEvent.click(screen.getByRole("button",{name:"Confirm $298 purchases"}));
  await waitFor(()=>expect(mocks.purchase).toHaveBeenCalledWith(expect.objectContaining({ purchaseIds:options.slice(0,2).map(x=>x.completionOptionId), declineIds:options.slice(2).map(x=>x.completionOptionId), totalCents:29800, confirmed:true })));
  await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith("/account/wallet"));
});
test("scrolling changes both wheels, keeping the rest works, and choices are not capped at 100", () => {
  const options=bulkOptions(101);
  render(<PurchaseOptionRail title="Gift card" options={options} canBulkDecline showSummary />);
  const wheel=screen.getAllByRole("listbox")[0]; Object.defineProperty(wheel,"clientHeight",{value:132});
  fireEvent.scroll(wheel,{target:{scrollTop:132}});
  expect(screen.getAllByRole("button",{name:"Make 4 purchases, decline 97"})).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("checkbox",{name:"Decline the other 97 after purchase"})[0]);
  expect(screen.getAllByRole("button",{name:"Make 4 purchases"})).toHaveLength(2);
  fireEvent.change(screen.getAllByRole("combobox")[1],{target:{value:"101"}});
  expect(screen.getAllByRole("button",{name:"Make 101 purchases"})).toHaveLength(2);
});
test("cancel submits nothing and an uncertain purchase result prevents a second submission", async () => {
  mocks.purchase.mockClear(); mocks.purchase.mockRejectedValueOnce(new Error("connection lost"));
  render(<PurchaseOptionRail title="Gift card" options={bulkOptions()} canBulkDecline />);
  fireEvent.click(screen.getByRole("button",{name:"Make 1 purchase, decline 7"}));
  fireEvent.click(screen.getByRole("button",{name:"Cancel"})); expect(mocks.purchase).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Make 1 purchase, decline 7"}));
  fireEvent.click(screen.getByRole("button",{name:"Confirm $149 purchase"}));
  await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("may already be saved"));
  await waitFor(()=>expect((screen.getByRole("button",{name:"Confirm $149 purchase"}) as HTMLButtonElement).disabled).toBe(true));
  expect(mocks.purchase).toHaveBeenCalledTimes(1);
});

test("option one opens automatically and each numbered ticket independently toggles its own option", () => {
  const base = storedActivityFixture().activity[2];
  const options = Array.from({ length: 10 }, (_, index) => ({
    ...base,
    entryId: `ent_${String(index + 1).padStart(32, "0")}`,
    completionOptionId: `option-${index + 1}`,
  }));
  render(<PurchaseOptionRail title={base.title} options={options} />);
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: /See 10 purchase options/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Hide purchase option 1 of 10" }).getAttribute("aria-expanded")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Show purchase option 10 of 10" }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
  const last = screen.getByRole("article", { name: "Purchase option 10 of 10" });
  expect(within(last).getByText("PURCHASE OPTION 10 OF 10")).toBeTruthy();
  expect(within(last).getByText("$1 applied")).toBeTruthy();
  expect(within(last).getByRole("link", { name: /Complete purchase for option 10 of 10/ }).getAttribute("href"))
    .toBe(`/account/entries?item=nike-court-shot-shoes&entry=ent_${"10".padStart(32, "0")}&filter=completion&from=purchase-options`);
  fireEvent.click(screen.getByRole("button", { name: "Hide purchase option 1 of 10" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: "Purchase option 10 of 10" })).toBeTruthy();
});

test("returning from a review opens only that entry and preserves its recorded credit", () => {
  const base = { ...storedActivityFixture().activity[2], entryId: `ent_${"1".repeat(32)}`, priceCents: 15000, paidCents: 200, remainingCents: 14800 };
  const other = { ...base, entryId: `ent_${"2".repeat(32)}`, paidCents: 100, remainingCents: 14900 };
  render(<PurchaseOptionRail title={base.title} options={[base, other]} initiallySelectedEntryId={base.entryId} />);
  expect(screen.getByRole("button", { name: "Hide purchase option 1 of 2" }).getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("button", { name: "Show purchase option 2 of 2" }).getAttribute("aria-expanded")).toBe("false");
  const ticket = screen.getByRole("article", { name: "Purchase option 1 of 2" });
  expect(within(ticket).getByText("$2 applied")).toBeTruthy();
  expect(within(ticket).getByText("$148 remaining")).toBeTruthy();
  expect(within(ticket).getByRole("link", { name: /Complete purchase for option 1 of 2/ })).toBeTruthy();
});

test("bulk decline confirms the current item's offers and offers a 30-second undo", async () => {
  const base = storedActivityFixture().activity[2];
  const options = [base, { ...base, entryId: `ent_${"2".repeat(32)}`, completionOptionId: `22222222-2222-4222-8222-222222222222` }];
  const optionIds = options.map(option => option.completionOptionId!);
  mocks.decline.mockResolvedValueOnce({ status: "succeeded", message: "2 offers declined. You can undo this for 30 seconds.", optionIds });
  mocks.undo.mockResolvedValueOnce({ status: "succeeded", message: "All offers restored.", optionIds });
  render(<PurchaseOptionRail title={base.title} options={options} canBulkDecline initiallyConfirmDecline />);
  expect(screen.getByText(`Decline all 2 offers for ${base.title}?`)).toBeTruthy();
  expect(mocks.decline).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm decline all" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Undo decline all" })).toBeTruthy());
  expect(mocks.decline).toHaveBeenCalledWith(base.slug);
  expect(screen.getByRole("timer", { name: /seconds left to undo/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo decline all" }));
  await waitFor(() => expect(mocks.undo).toHaveBeenCalledWith(optionIds));
  expect(mocks.replace).toHaveBeenCalledWith(`/account/purchase-options/${encodeURIComponent(base.slug)}`);
  expect(mocks.refresh).toHaveBeenCalled();
});

test("keeping offers dismisses confirmation and clears the confirmation link", () => {
  const base = storedActivityFixture().activity[2];
  render(<PurchaseOptionRail title={base.title} options={[base]} canBulkDecline initiallyConfirmDecline />);
  fireEvent.click(screen.getByRole("button", { name: "Keep my offers" }));
  expect(screen.queryByRole("group", { name: "Confirm declining all offers" })).toBeNull();
  expect(screen.getByRole("button", { name: "Show purchase option 1 of 1" })).toBeTruthy();
  expect(mocks.replace).toHaveBeenCalledWith(`/account/purchase-options/${encodeURIComponent(base.slug)}`);
});
