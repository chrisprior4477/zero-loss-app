import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { WalletLedger } from "./WalletLedger";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("quick dates preserve funding filter and all time clears only the dates", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-08T02:00:00Z"));
  try {
    render(<WalletLedger entries={[
      { id: "today", entry_type: "DEPOSIT", amount: 100, created_at: "2026-11-07T17:00:00Z" },
      { id: "older", entry_type: "DEPOSIT", amount: 100, created_at: "2026-10-01T17:00:00Z" },
      { id: "entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-11-07T17:00:00Z" },
    ]} />);
    fireEvent.click(screen.getByRole("button", { name: "Funding" }));
    fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    expect(screen.getByLabelText("From date")).toHaveProperty("value", "2026-11-01");
    expect(screen.getByLabelText("To date")).toHaveProperty("value", "2026-11-07");
    expect(screen.getAllByRole("listitem").map(row => row.id)).toEqual(["transaction-today"]);
    fireEvent.click(screen.getByRole("button", { name: "All time" }));
    expect(screen.getAllByRole("listitem").map(row => row.id)).toEqual(["transaction-today", "transaction-older"]);
    expect(screen.getByRole("button", { name: "Funding" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("From date")).toHaveProperty("value", "");
  } finally { vi.useRealTimers(); }
});

test("searches past the visible batch by product, retailer, and exact posted amount", () => {
  const created_at = "2026-11-05T17:00:00Z";
  const deposits = Array.from({ length: 12 }, (_, index) => ({ id: `deposit-${index}`, entry_type: "DEPOSIT", amount: 24900, created_at }));
  const purchase = { id: "older-purchase", entry_type: "PURCHASE_DEBIT", amount: -24900, created_at: "2026-11-01T17:00:00Z",
    product: { title: "Apple AirPods Pro 3", retailer: "Best Buy", image: "/test.png", slug: "airpods-pro-3" } };
  const card = { ...purchase, id: "gift-card", amount: -9900, product: { ...purchase.product, title: "$100 Publix Gift Card", retailer: "Publix" } };
  const refund = { ...purchase, id: "refund", entry_type: "REFUND", amount: 24950 };
  render(<WalletLedger entries={[...deposits, purchase, card, refund]} />);
  const input = screen.getByRole("searchbox", { name: "Search transactions" });
  const type = (value: string) => {
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Go to transaction search results" }));
  };
  const rows = () => screen.getAllByRole("listitem").map(row => row.id);
  expect(screen.queryByText(purchase.product.title)).toBeNull();
  type("AIRPODS PRO 3");
  expect(rows()).toEqual(["transaction-older-purchase", "transaction-refund"]);
  type("Best Buy");
  expect(rows()).toEqual(["transaction-older-purchase", "transaction-refund"]);
  type("$249");
  expect(screen.getByRole("button", { name: "All" }).textContent).toBe("All13");
  fireEvent.click(screen.getByRole("button", { name: "Purchases" }));
  expect(rows()).toEqual(["transaction-older-purchase"]);
  type("AirPods −$249.00");
  expect(rows()).toEqual(["transaction-older-purchase"]);
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-02" } });
  expect(screen.getByRole("heading", { name: "No matching transactions" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(input).toHaveProperty("value", "");
  expect(screen.getByLabelText("From date")).toHaveProperty("value", "");
  type("$100 Publix Gift Card");
  expect(rows()).toEqual(["transaction-gift-card"]);
  type("Publix $100");
  expect(rows()).toEqual(["transaction-gift-card"]);
  type("Publix -$100");
  expect(screen.getByRole("heading", { name: "No matching transactions" })).toBeTruthy();
  type("+$249.50");
  expect(rows()).toEqual(["transaction-refund"]);
  fireEvent.click(screen.getByRole("button", { name: "Clear transaction search" }));
  expect(input).toHaveProperty("value", "");
  expect(document.activeElement).toBe(input);
});

test("voice search reviews the transcript before Go, and the two X buttons clear or close it", () => {
  class Speech {
    static active: Speech;
    onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
    onerror = null;
    onend = null;
    constructor() { Speech.active = this; }
    start() {}
    stop() {}
    abort = vi.fn();
  }
  vi.stubGlobal("SpeechRecognition", Speech);
  const created_at = "2026-11-05T17:00:00Z";
  render(<WalletLedger entries={[
    { id: "other", entry_type: "DEPOSIT", amount: 2500, created_at },
    { id: "best-buy", entry_type: "PURCHASE_DEBIT", amount: -24900, created_at,
      product: { title: "Apple AirPods Pro 3", retailer: "Best Buy", image: "/test.png" } },
  ]} />);
  const form = within(screen.getByRole("search", { name: "Search wallet transactions" }));
  const input = form.getByRole("searchbox");
  const mic = () => form.getByRole("button", { name: "Start voice search" });
  const close = () => form.getByRole("button", { name: "Close transaction search" });
  const clear = () => form.getByRole("button", { name: "Clear transaction search" });

  fireEvent.click(mic());
  expect(form.getByRole("button", { name: "Stop voice search" })).toBeTruthy();
  act(() => Speech.active.onresult?.({ results: [[{ transcript: "Best Buy" }]] }));
  expect(input).toHaveProperty("value", "Best Buy");
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(clear()).toBeTruthy();
  expect(close()).toBeTruthy();
  fireEvent.click(form.getByRole("button", { name: "Go to transaction search results" }));
  expect(screen.getByRole("listitem").id).toBe("transaction-best-buy");
  expect(document.activeElement).toBe(screen.getByRole("list", { name: "Transaction tickets" }));

  fireEvent.click(mic());
  const late = Speech.active.onresult!;
  fireEvent.click(close());
  act(() => late({ results: [[{ transcript: "Canceled search" }]] }));
  expect(input).toHaveProperty("value", "Best Buy");
  expect(Speech.active.abort).toHaveBeenCalledOnce();
  expect(screen.getByRole("listitem").id).toBe("transaction-best-buy");
  fireEvent.click(clear());
  expect(input).toHaveProperty("value", "");
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
});

test("Purchases isolates gift-card charges, including older records without product metadata, and keeps exact result links", () => {
  const item = { ...storedActivityFixture().activity[0], entryId: `ent_${"4".repeat(32)}`, status: "completed" as const, rewardId: "purchased-reward", rewardStatus: "ready" as const };
  const created_at = "2026-11-05T17:00:00Z";
  render(<WalletLedger entries={[
    { id: "deposit", entry_type: "DEPOSIT", amount: 50000, created_at },
    { id: "entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at },
    { id: "purchase", entry_type: "PURCHASE_DEBIT", amount: -9900, created_at, entryIds: [item.entryId], product: { title: item.title, image: item.image, slug: item.slug } },
    { id: "older-purchase", entry_type: "PURCHASE_DEBIT", amount: -7400, created_at: "2026-11-01T17:00:00Z" },
    { id: "refund", entry_type: "REFUND", amount: 100, created_at },
  ]} activity={[item]} />);
  const resultHref = screen.getByRole("link", { name: "View result" }).getAttribute("href");
  expect(resultHref).toContain("purchased-reward");
  fireEvent.click(screen.getByRole("button", { name: "Purchases" }));
  expect(screen.getByRole("button", { name: "Purchases" }).textContent).toBe("Purchases2");
  expect(screen.getAllByText("Gift-card purchase")).toHaveLength(2);
  expect(screen.queryByText("Funds added")).toBeNull();
  expect(screen.queryByText("Entry purchase")).toBeNull();
  expect(screen.queryByText("Refund")).toBeNull();
  expect(screen.getByRole("link", { name: "View result" }).getAttribute("href")).toBe(resultHref);
  expect(screen.getByRole("link", { name: "View product" }).getAttribute("href")).toBe(`/items/${item.slug}`);
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-05" } });
  expect(screen.getByRole("button", { name: "Purchases" }).textContent).toBe("Purchases1");
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href")).toBe("/support?transaction=purchase&from=wallet");
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-06" } });
  expect(screen.getByRole("heading", { name: "No gift-card purchases" })).toBeTruthy();
});
test("transaction actions separate the exact entry, its product, and support", () => {
  const item = { ...storedActivityFixture().activity[0], entryId: `ent_${"1".repeat(32)}` };
  const entry = { id: "ledger-1", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-10-24T12:00:00Z", entryIds: [item.entryId], product: { title: item.title, image: item.image, slug: item.slug } };
  render(<WalletLedger entries={[entry]} activity={[item]} />);
  expect(screen.getByRole("link", { name: "View entry" }).getAttribute("href")).toBe(`/account/entries/${item.entryId}?entries=open#saved-entry-rail`);
  expect(screen.getByRole("link", { name: "View product" }).getAttribute("href")).toBe(`/items/${item.slug}`);
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href")).toBe("/support?transaction=ledger-1");
});
test("each transaction's support shortcut preserves its identity through filtering", () => {
  render(<WalletLedger entries={[
    { id: "11111111-1111-4111-8111-111111111111", entry_type: "DEPOSIT", amount: 500, created_at: "2026-09-21T12:00:00Z" },
    { id: "22222222-2222-4222-8222-222222222222", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-09-21T12:01:00Z" },
  ]} />);
  expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Entries" }));
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href")).toBe("/support?transaction=22222222-2222-4222-8222-222222222222");
});

test("Refunds remains its own filter, separate from released entry holds", () => {
  render(<WalletLedger entries={[
    { id: "11111111-1111-4111-8111-111111111111", entry_type: "DEPOSIT", amount: 500, created_at: "2026-09-21T12:00:00Z" },
    { id: "22222222-2222-4222-8222-222222222222", entry_type: "ENTRY_HOLD_RELEASE", amount: 100, created_at: "2026-09-21T12:01:00Z" },
    { id: "33333333-3333-4333-8333-333333333333", entry_type: "REFUND", amount: 100, created_at: "2026-09-21T12:02:00Z" },
  ]} />);
  expect(screen.getByRole("button", { name: "All" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Funding" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Entries" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Refunds" }));
  expect(screen.getByText("Refund")).toBeTruthy();
  expect(screen.queryByText("Entry reservation released")).toBeNull();
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href")).toBe("/support?transaction=33333333-3333-4333-8333-333333333333");
});

test("history expands from its first batch and filters an inclusive date range", () => {
  const entries = Array.from({ length: 7 }, (_, index) => ({
    id: `11111111-1111-4111-8111-11111111111${index}`,
    entry_type: "DEPOSIT", amount: 100, created_at: `2026-09-${String(20 + index).padStart(2, "0")}T12:00:00Z`,
  }));
  render(<WalletLedger entries={entries} />);
  expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: /See more transactions/ }));
  expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-09-23" } });
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-09-24" } });
  expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(2);
  expect(screen.getByText(/Showing 2 of 2 transactions/)).toBeTruthy();
});

const dateEntries = [
  { id: "funding-before", entry_type: "DEPOSIT", amount: 100, created_at: "2026-11-01T12:00:00Z" },
  { id: "funding-after", entry_type: "DEPOSIT", amount: 200, created_at: "2026-11-07T12:00:00Z" },
  { id: "entry-between", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-11-05T12:00:00Z" },
];

test.each(["From date", "To date"])("reversed dates keep the last valid results when %s is entered first", first => {
  render(<WalletLedger entries={dateEntries} />);
  const setDate = (label: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: label === "From date" ? "2026-11-06" : "2026-11-01" } });
  setDate(first);
  setDate(first === "From date" ? "To date" : "From date");
  const message = screen.getByRole("alert");
  expect(message.textContent).toBe("From date must be on or before To date. Showing results from the last valid range.");
  for (const label of ["From date", "To date"]) {
    expect(screen.getByLabelText(label).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText(label).getAttribute("aria-describedby")).toBe(message.id);
  }
  expect(screen.getByText("Showing 1 of 1 transactions")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href"))
    .toBe(first === "From date" ? "/support?transaction=funding-after" : "/support?transaction=funding-before");
  expect(screen.queryByText("No all transactions")).toBeNull();
  // Correcting one date immediately reapplies an inclusive range.
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-11-07" } });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByLabelText("From date").hasAttribute("aria-invalid")).toBe(false);
  expect(screen.getByText("Showing 1 of 1 transactions")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href")).toBe("/support?transaction=funding-after");
});

test("ignoring reversed dates preserves category and archive choices, and Clear dates resets the warning", () => {
  render(<WalletLedger entries={dateEntries} hiddenIds={["funding-before"]} />);
  fireEvent.click(screen.getByRole("button", { name: "Funding" }));
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-06" } });
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-11-01" } });
  expect(screen.getByRole("button", { name: "Funding" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href")).toBe("/support?transaction=funding-after");
  fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect((screen.getByLabelText("From date") as HTMLInputElement).value).toBe("");
  expect((screen.getByLabelText("To date") as HTMLInputElement).value).toBe("");
  expect(screen.getByText("Showing 1 of 1 transactions")).toBeTruthy();
});

test("same-day ranges use the account time zone and empty results have a clear label", () => {
  render(<WalletLedger entries={[
    { id: "local-nov-5", entry_type: "DEPOSIT", amount: 100, created_at: "2026-11-06T03:00:00Z" },
    { id: "local-nov-6", entry_type: "DEPOSIT", amount: 200, created_at: "2026-11-06T06:00:00Z" },
  ]} timeZone="America/New_York" />);
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-05" } });
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-11-05" } });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href")).toBe("/support?transaction=local-nov-5");
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-01" } });
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-11-01" } });
  expect(screen.getByRole("heading", { name: "No matching transactions" })).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("shows fixed pages of five even when a short screen would only fit two full-height tickets", () => {
  const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
    const index = this.parentElement ? Array.from(this.parentElement.children).indexOf(this) : 0;
    return new DOMRect(0, index * 160, 320, 160);
  });
  vi.stubGlobal("innerHeight", 500);
  try {
    const rows = Array.from({ length: 12 }, (_, n) => ({ id: `deposit-${n}`, entry_type: "DEPOSIT", amount: 100, created_at: "2026-10-01T10:00:00Z" }));
    render(<WalletLedger entries={rows} />);
    const list = screen.getByRole("list", { name: "Transaction tickets" });
    const ids = () => Array.from(list.children, row => row.id);
    const expected = (start: number) => rows.slice(start, start + 5).map(row => `transaction-${row.id}`);
    expect(ids()).toEqual(expected(0));
    fireEvent.click(screen.getByRole("button", { name: "See more transactions (7 remaining)" }));
    expect(ids()).toEqual(expected(5));
    expect(screen.getByText("Showing 6–10 of 12 transactions")).toBeTruthy();
    expect(list.style.maxHeight).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "See more transactions (2 remaining)" }));
    expect(ids()).toEqual(expected(10));
    expect(screen.queryByRole("button", { name: /See more transactions/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(ids()).toEqual(expected(5));
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(ids()).toEqual(expected(0));
  } finally {
    rect.mockRestore();
    vi.unstubAllGlobals();
  }
});

test("collapsing all transactions returns to the history heading, not payment deposits", () => {
  const entries = Array.from({ length: 7 }, (_, index) => ({
    id: `11111111-1111-4111-8111-11111111111${index}`,
    entry_type: "DEPOSIT", amount: 100, created_at: `2026-09-${String(20 + index).padStart(2, "0")}T12:00:00Z`,
  }));
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  try {
    render(<><section id="transactions"><h2 id="transactions-heading" tabIndex={-1}>Transaction history</h2><WalletLedger entries={entries} /></section><h2>Payment deposits</h2></>);
    fireEvent.click(screen.getByRole("button", { name: /See more transactions/ }));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("wallet-transaction-list"));
    scrollIntoView.mockClear();
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(5);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Transaction history" }));
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("heading", { name: "Transaction history" }).parentElement);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
    fireEvent.click(screen.getByRole("button", { name: /See more transactions/ }));
    scrollIntoView.mockClear();
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-09-23" } });
    expect(scrollIntoView).not.toHaveBeenCalled();
  } finally {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  }
});

test("shows the saved prize thumbnail and title beside the existing transaction icon", () => {
  render(<WalletLedger entries={[
    { id: "11111111-1111-4111-8111-111111111111", entry_type: "ENTRY_HOLD_RELEASE", amount: 100, created_at: "2026-09-21T12:00:00Z", product: { title: "$100 Best Buy Gift Card", image: "/catalog/best-buy-100-gift-card.svg" } },
    { id: "22222222-2222-4222-8222-222222222222", entry_type: "DEPOSIT", amount: 2500, created_at: "2026-09-21T12:01:00Z" },
  ]} />);
  const image = screen.getByRole("img", { name: "$100 Best Buy Gift Card" });
  expect(image.getAttribute("src")).toContain("best-buy-100-gift-card.svg");
  expect(screen.getByText("$100 Best Buy Gift Card")).toBeTruthy();
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(screen.getByText("Funds added")).toBeTruthy();
});

test("demo transaction clear sits below the list and archived rows remain inspectable", () => {
  const hiddenId = "11111111-1111-4111-8111-111111111111";
  render(<WalletLedger canResetDemoHistory hiddenIds={[hiddenId]} entries={[
    { id: hiddenId, entry_type: "DEPOSIT", amount: 2500, created_at: "2026-09-21T12:00:00Z" },
    { id: "22222222-2222-4222-8222-222222222222", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-09-21T12:01:00Z" },
  ]} />);
  expect(screen.queryByText("Funds added")).toBeNull();
  expect(screen.getByRole("button", { name: "Clear All Demo Transactions" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /View archived demo transactions/ }));
  expect(screen.getByText("Funds added")).toBeTruthy();
});

test("full demo reset leaves no transactions or archive shortcut in the normal view", () => {
  const hiddenId = "11111111-1111-4111-8111-111111111111";
  render(<WalletLedger entries={[{ id: hiddenId, entry_type: "DEPOSIT", amount: 2500, created_at: "2026-09-21T12:00:00Z" }]} hiddenIds={[hiddenId]} hideArchived />);
  expect(screen.queryByText("Funds added")).toBeNull();
  expect(screen.queryByRole("button", { name: /View archived demo transactions/ })).toBeNull();
  expect(screen.getByText("Your demo transaction history has been reset.")).toBeTruthy();
});
