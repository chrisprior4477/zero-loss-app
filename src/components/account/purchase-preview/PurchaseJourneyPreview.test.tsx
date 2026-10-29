import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { PurchaseJourneyPreview } from "./PurchaseJourneyPreview";

beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals(); });

test.each([1, 2, 3] as const)("version %s requires a separate purchase confirmation after funding", version => {
  const network = vi.fn();vi.stubGlobal("fetch", network);
  render(<PurchaseJourneyPreview initialVersion={version} />);
  expect(screen.getByText("Please add $260 to continue.")).toBeTruthy();
  if (version !== 2) fireEvent.click(screen.getByRole("button", { name: "Add $260 to continue" }));
  const depositLabel = version === 1 ? "Add $260 & return to purchase" : "Add $260 to wallet";
  fireEvent.click(screen.getByRole("button", { name: depositLabel }));
  const popup = screen.getByRole("dialog", { name: "Confirm your purchase" });
  expect(within(popup).getByText("$399")).toBeTruthy();
  expect(screen.queryByText("PREVIEW PURCHASE COMPLETE")).toBeNull();
  fireEvent.click(within(popup).getByRole("button", { name: "Confirm purchase" }));
  expect(screen.getByRole("heading", { name: "Your gift card is ready." })).toBeTruthy();
  expect(screen.getByText("$0")).toBeTruthy();
  expect(network).not.toHaveBeenCalled();
});

test("Undo preserves the funded wallet and exact selected options", () => {
  render(<PurchaseJourneyPreview initialVersion={2} />);
  fireEvent.click(screen.getByText("Choose specific options · 1"));
  fireEvent.click(screen.getByRole("button", { name: "OPTION 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Add $659 to wallet" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("Choose specific options · 1, 3")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Review $798 purchase" })).toBeTruthy();
  expect(screen.getByText("Nothing purchased. Your preview wallet and choices are unchanged.")).toBeTruthy();
});

test("countdown expires without purchasing or declining anything", () => {
  vi.useFakeTimers();render(<PurchaseJourneyPreview initialVersion={2} />);
  fireEvent.click(screen.getByRole("button", { name: "Add $260 to wallet" }));
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Review $399 purchase" })).toBeTruthy();
  expect(screen.queryByText("PREVIEW PURCHASE COMPLETE")).toBeNull();
});

test("a sufficient wallet skips funding, and switching versions resets only the preview", () => {
  render(<PurchaseJourneyPreview initialVersion={2} />);
  fireEvent.click(screen.getByText("Try a different wallet balance"));
  fireEvent.change(screen.getByRole("combobox", { name: "Preview starting balance" }), { target: { value: "50000" } });
  expect(screen.queryByRole("button", { name: "Add $260 to wallet" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Review $399 purchase" }));
  expect(within(screen.getByRole("dialog")).getByText("$101")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  fireEvent.click(screen.getByRole("button", { name: "1 Wallet return" }));
  expect(screen.queryByText("Nothing purchased. Your preview wallet and choices are unchanged.")).toBeNull();
  expect(screen.getByText("$500")).toBeTruthy();
});

test("fractional and insufficient deposits cannot advance", () => {
  render(<PurchaseJourneyPreview initialVersion={2} />);
  fireEvent.click(screen.getByText("Add a different amount"));
  const amount = screen.getByRole("textbox", { name: "Whole dollars (USD)" });
  fireEvent.change(amount, { target: { value: "260.50" } });
  fireEvent.click(screen.getByRole("button", { name: "Add funds to wallet" }));
  expect(screen.getByRole("alert").textContent).toContain("whole-dollar");
  fireEvent.change(amount, { target: { value: "259" } });
  fireEvent.click(screen.getByRole("button", { name: "Add $259 to wallet" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
