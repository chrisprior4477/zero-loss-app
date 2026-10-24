import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { WalletLedger } from "./WalletLedger";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
afterEach(cleanup);
test("transaction actions separate the exact entry, its product, and support", () => {
  const item = { ...storedActivityFixture().activity[0], entryId: `ent_${"1".repeat(32)}` };
  const entry = { id: "ledger-1", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-10-24T12:00:00Z", entryIds: [item.entryId], product: { title: item.title, image: item.image, slug: item.slug } };
  render(<WalletLedger entries={[entry]} activity={[item]} />);
  expect(screen.getByRole("link", { name: "View entry" }).getAttribute("href")).toBe(`/account/entries/${item.entryId}`);
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

test("history starts with five rows, expands, and filters an inclusive date range", () => {
  const entries = Array.from({ length: 7 }, (_, index) => ({
    id: `11111111-1111-4111-8111-11111111111${index}`,
    entry_type: "DEPOSIT", amount: 100, created_at: `2026-09-${String(20 + index).padStart(2, "0")}T12:00:00Z`,
  }));
  render(<WalletLedger entries={entries} />);
  expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: /See all 7 transactions/ }));
  expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(7);
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-09-23" } });
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-09-24" } });
  expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(2);
  expect(screen.getByText(/Showing 2 of 2 transactions/)).toBeTruthy();
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
    fireEvent.click(screen.getByRole("button", { name: /See all 7 transactions/ }));
    expect(scrollIntoView).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Show just the first five transactions" }));
    expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(5);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Transaction history" }));
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("heading", { name: "Transaction history" }).parentElement);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
    fireEvent.click(screen.getByRole("button", { name: /See all 7 transactions/ }));
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-09-23" } });
    expect(scrollIntoView).toHaveBeenCalledOnce();
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
