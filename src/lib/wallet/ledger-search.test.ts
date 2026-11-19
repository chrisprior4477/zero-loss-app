import { expect, test } from "vitest";
import { searchLedger } from "./ledger-search";
import type { LedgerEntryRow } from "./snapshot";

test("keeps an amount alternative scoped to the transaction type and recognizes signed speech", () => {
  const created_at = "2026-11-05T20:00:00Z";
  const entries: LedgerEntryRow[] = [
    { id: "one", entry_type: "DEPOSIT", amount: 100, created_at },
    { id: "two", entry_type: "DEPOSIT", amount: 200, created_at },
    { id: "three", entry_type: "DEPOSIT", amount: 300, created_at },
    { id: "purchase", entry_type: "ENTRY_DEBIT", amount: -100, created_at },
    { id: "refund", entry_type: "REFUND", amount: 100, created_at },
  ];
  const search = (query: string) => searchLedger(entries, query, entry =>
    [entry.entry_type === "ENTRY_DEBIT" ? "Entry purchase" : entry.entry_type]).map(entry => entry.id);
  expect(search("Deposit $1 or $2")).toEqual(["one", "two"]);
  expect(search("minus one dollar")).toEqual(["purchase"]);
  expect(search("refunds")).toEqual(["refund"]);
  expect(search("entry purchases")).toEqual(["purchase"]);
});
