import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { MobileEntrySummary } from "./MobileEntrySummary";

afterEach(cleanup);

test("puts the entry price, retailer card and confirmed availability next to the mobile jump action", () => {
  render(<MobileEntrySummary entryPrice={1} giftCardValue={400} retailer="Best Buy" remaining={7} />);

  const summary = screen.getByRole("region", { name: "Entry at a glance" });
  expect(summary.textContent).toContain("$1.00per entry");
  expect(summary.textContent).toContain("$400 Best Buy digital gift card");
  expect(summary.textContent).toContain("7 left");
  expect(screen.getByRole("link", { name: "See $1.00 entry ↓" }).getAttribute("href")).toBe("#enter-entry");
});

test("does not invent availability when it was not refreshed, or invite entry when sold out", () => {
  const { rerender } = render(<MobileEntrySummary entryPrice={1} giftCardValue={25} retailer="Netflix" remaining={null} />);
  expect(screen.queryByText(/left/)).toBeNull();

  rerender(<MobileEntrySummary entryPrice={1} giftCardValue={25} retailer="Netflix" remaining={0} />);
  expect(screen.getByText("No entries left")).toBeTruthy();
  expect(screen.getByRole("link", { name: "View entry status ↓" }).getAttribute("href")).toBe("#enter-entry");
});
