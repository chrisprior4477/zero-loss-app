import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { PurchaseOptionRail } from "./PurchaseOptionRail";

vi.mock("next/image", () => ({ default: () => <span /> }));
afterEach(cleanup);

test("expansion keeps ten purchase options numbered and linked to their own saved entry", () => {
  const base = storedActivityFixture().activity[2];
  const options = Array.from({ length: 10 }, (_, index) => ({
    ...base,
    entryId: `ent_${String(index + 1).padStart(32, "0")}`,
    completionOptionId: `option-${index + 1}`,
  }));
  render(<PurchaseOptionRail title={base.title} options={options} />);
  const toggle = screen.getByRole("button", { name: "See 10 purchase options" });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(toggle);
  expect(screen.getByRole("button", { name: "Hide 10 purchase options" }).getAttribute("aria-expanded")).toBe("true");
  const tickets = screen.getAllByRole("article");
  expect(tickets).toHaveLength(10);
  const last = tickets[9];
  expect(within(last).getByText("PURCHASE OPTION 10 OF 10")).toBeTruthy();
  expect(within(last).getByText("$1 applied")).toBeTruthy();
  expect(within(last).getByRole("link", { name: /Review purchase option 10 of 10/ }).getAttribute("href"))
    .toBe(`/account/entries?item=nike-court-shot-shoes&entry=ent_${"10".padStart(32, "0")}&filter=completion&from=purchase-options`);
});
