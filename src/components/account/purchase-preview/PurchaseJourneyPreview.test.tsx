import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { PurchaseJourneyPreview } from "./PurchaseJourneyPreview";

beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals(); });

test.each([1, 2, 3, 4] as const)("version %s requires a separate purchase confirmation after funding", version => {
  const network = vi.fn();vi.stubGlobal("fetch", network);
  render(<PurchaseJourneyPreview initialVersion={version} />);
  expect(screen.getByText("Please add $260 to continue.")).toBeTruthy();
  if (version === 1 || version === 3) fireEvent.click(screen.getByRole("button", { name: "Add $260 to continue" }));
  const depositLabel = version === 1 ? "Add $260 & return to purchase" : "Add $260 to wallet";
  fireEvent.click(screen.getByRole("button", { name: depositLabel }));
  const popup = screen.getByRole("dialog", { name: "Confirm your purchase" });
  expect(within(popup).getByText("$399")).toBeTruthy();
  expect(screen.queryByText("PREVIEW PURCHASE COMPLETE")).toBeNull();
  fireEvent.click(within(popup).getByRole("button", { name: "Confirm purchase" }));
  expect(screen.getByRole("heading", { name: "Your gift card is ready." })).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "Purchase walkthrough" })).getByText("$0")).toBeTruthy();
  expect(network).not.toHaveBeenCalled();
});

test("Undo preserves the funded wallet and exact selected options", () => {
  render(<PurchaseJourneyPreview initialVersion={2} />);
  fireEvent.click(screen.getByRole("button", { name: "Choose options · 1" }));
  fireEvent.click(screen.getByRole("button", { name: "OPTION 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  fireEvent.click(screen.getByRole("button", { name: "Add $659 to wallet" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Choose options · 1, 3" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Review $798 purchase" })).toBeTruthy();
  expect(screen.getByText("Nothing purchased. Your wallet and choices are unchanged.")).toBeTruthy();
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
  fireEvent.change(screen.getByRole("combobox", { name: "Preview starting balance" }), { target: { value: "50000" } });
  expect(screen.queryByRole("button", { name: "Add $260 to wallet" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Review $399 purchase" }));
  expect(within(screen.getByRole("dialog")).getByText("$101")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  fireEvent.click(screen.getByRole("button", { name: "1 Wallet return" }));
  expect(screen.queryByText("Nothing purchased. Your wallet and choices are unchanged.")).toBeNull();
  expect(within(screen.getByRole("region", { name: "Purchase walkthrough" })).getByText("$500")).toBeTruthy();
});

test("the buying and declining wheels never exceed the available options", () => {
  render(<PurchaseJourneyPreview initialVersion={4} />);
  fireEvent.click(screen.getByRole("radio", { name: "Buying 2" }));
  expect((screen.getByRole("radio", { name: "Declining 1" }) as HTMLInputElement).checked).toBe(true);
  expect(screen.queryByRole("radio", { name: "Declining 2" })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "Declining 0" }));
  fireEvent.click(screen.getByRole("button", { name: "Add $659 to wallet" }));
  expect(within(screen.getByRole("dialog")).getByText("Other offers stay available.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
  expect(screen.getByText(/No other offers were declined.*1 kept available/)).toBeTruthy();
});

test("the quick popup retains decline controls and returns from choosing exact options", () => {
  render(<PurchaseJourneyPreview initialVersion={3} />);
  fireEvent.click(screen.getByRole("button", { name: "Add $260 to continue" }));
  const popup = within(screen.getByRole("dialog"));
  fireEvent.click(popup.getByRole("checkbox", { name: /Decline the other 2/ }));
  fireEvent.click(popup.getByRole("button", { name: "Choose options · 1" }));
  fireEvent.click(screen.getByRole("button", { name: "OPTION 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Use these options" }));
  expect(screen.getByRole("dialog", { name: "Add funds to continue" })).toBeTruthy();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add $659 to wallet" }));
  expect(within(screen.getByRole("dialog")).getByText("Other offers stay available.")).toBeTruthy();
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

test("keeping other offers stays selected after buying all and reducing the quantity", () => {
  render(<PurchaseJourneyPreview initialVersion={4} />);
  fireEvent.click(screen.getByRole("radio", { name: "Declining 0" }));
  fireEvent.click(screen.getByRole("radio", { name: "Buying 3" }));
  fireEvent.click(screen.getByRole("radio", { name: "Buying 1" }));
  expect((screen.getByRole("radio", { name: "Declining 0" }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByText("2 kept")).toBeTruthy();
});

test.each([1, 2, 3] as const)("refinement %s retains offers for later without changing the purchase price", refinement => {
  const network = vi.fn();vi.stubGlobal("fetch", network);
  render(<PurchaseJourneyPreview initialVersion={3} initialRefinement={refinement} />);
  expect(screen.getByRole("heading", { name: "Buy 1 $400 gift card" })).toBeTruthy();
  expect(screen.getByText(/already paid \+/).textContent).toContain("Your $1 already paid + $399 remaining = $400");
  if (refinement === 1) fireEvent.click(screen.getByRole("checkbox", { name: /Decline and remove/ }));
  else {
    fireEvent.click(screen.getByRole("button", { name: /Keep for later/ }));
    expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Decline & remove/ }).getAttribute("aria-pressed")).toBe("false");
  }
  fireEvent.click(screen.getByRole("radio", { name: "Buying 3" }));
  fireEvent.click(screen.getByRole("radio", { name: "Buying 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Add $260 to continue" }));
  const popup = within(screen.getByRole("dialog"));
  expect(popup.getByText("Keep 2 in My Activity · expires in 30 days.")).toBeTruthy();
  fireEvent.click(popup.getByRole("button", { name: "+$25" }));
  expect(popup.getByText("$260 needed · $25 stays in your wallet after purchase.")).toBeTruthy();
  fireEvent.click(popup.getByRole("button", { name: "Add $285 to wallet" }));
  expect(within(screen.getByRole("dialog")).getByText("$25")).toBeTruthy();
  expect(within(screen.getByRole("dialog")).getByText(/Keep the other 2 offers available in My Activity/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
  expect(screen.getByText(/2 other offers stay available in My Activity for later/)).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "Purchase walkthrough" })).getByText("$25")).toBeTruthy();
  expect(network).not.toHaveBeenCalled();
});

test("tappable choices are exclusive, apply only on purchase, and survive Undo", () => {
  render(<PurchaseJourneyPreview initialVersion={3} initialRefinement={3} />);
  fireEvent.click(screen.getByRole("button", { name: /Keep for later/ }));
  fireEvent.click(screen.getByRole("button", { name: /Decline & remove/ }));
  expect(screen.getByRole("button", { name: /Keep for later/ }).getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Add $260 to continue" }));
  fireEvent.click(screen.getByRole("button", { name: "+$30" }));
  fireEvent.click(screen.getByRole("button", { name: "Add $290 to wallet" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.queryByText(/declined and removed in this preview/)).toBeNull();
  expect(screen.getByRole("button", { name: /Decline & remove/ }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Review $399 purchase" }));
  expect(within(screen.getByRole("dialog")).getByText("$30")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirm purchase" }));
  expect(screen.getByText("2 other offers were declined and removed in this preview.")).toBeTruthy();
});
