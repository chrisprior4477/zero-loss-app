import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { PurchaseOptionRail } from "./PurchaseOptionRail";

vi.mock("next/image", () => ({ default: () => <span /> }));
afterEach(cleanup);

test("each numbered ticket independently opens only its own purchase option", () => {
  const base = storedActivityFixture().activity[2];
  const options = Array.from({ length: 10 }, (_, index) => ({
    ...base,
    entryId: `ent_${String(index + 1).padStart(32, "0")}`,
    completionOptionId: `option-${index + 1}`,
  }));
  render(<PurchaseOptionRail title={base.title} options={options} />);
  expect(screen.queryAllByRole("article")).toHaveLength(0);
  expect(screen.queryByRole("button", { name: /See 10 purchase options/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show purchase option 1 of 10" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
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
