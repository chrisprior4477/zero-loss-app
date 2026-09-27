import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WalletLedger } from "./WalletLedger";
afterEach(cleanup);
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
