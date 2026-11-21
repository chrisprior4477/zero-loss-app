import { expect, test } from "vitest";
import { searchLedger } from "./ledger-search";
import { ledgerDescription } from "./transaction-links";
import type { LedgerEntryRow } from "./snapshot";

test("keeps natural amount phrases scoped to posted values and transaction type", () => {
  const created_at = "2026-11-05T20:00:00Z";
  const entries: LedgerEntryRow[] = [
    { id: "fund", entry_type: "DEPOSIT", amount: 2500, created_at },
    { id: "larger", entry_type: "DEPOSIT", amount: 5000, created_at },
    { id: "max", entry_type: "DEPOSIT", amount: 7500, created_at },
    { id: "debit", entry_type: "PURCHASE_DEBIT", amount: -2500, created_at },
    { id: "more", entry_type: "PURCHASE_DEBIT", amount: -5000, created_at },
    { id: "negative-cents", entry_type: "CORRECTION", amount: -25, created_at },
    { id: "positive-cents", entry_type: "REFUND", amount: 25, created_at },
  ];
  const search = (query: string) => searchLedger(entries, query, entry => ledgerDescription(entry.entry_type)).map(entry => entry.id);
  for (const query of ["deposits of $25", "deposit USD $25", "deposit 25", "deposit for twenty-five dollars"]) expect(search(query), query).toEqual(["fund"]);
  for (const query of ["negative $25", "$-25"]) expect(search(query), query).toEqual(["debit"]);
  for (const query of ["minus twenty-five cents", "25 cents adjustment", "adjustment twenty-five cents"]) expect(search(query), query).toEqual(["negative-cents"]);
  expect(search("purchases $25, $50")).toEqual(["debit", "more"]);
  expect(search("deposits between $25 and $50")).toEqual(["fund", "larger"]);
  expect(search("deposit at least $25")).toEqual(["fund", "larger", "max"]);
  expect(search("transaction $25")).toEqual(["fund", "debit"]);
  expect(search("deposit US$25")).toEqual(["fund"]);
  expect(search("deposit >= $25")).toEqual(["fund", "larger", "max"]);
  expect(search("deposits above $25")).toEqual(["larger", "max"]);
  expect(search("paid $25")).toEqual(["debit"]);
  expect(search("paid -$25")).toEqual(["debit"]);
  expect(search("paid ($25)")).toEqual(["debit"]);
  expect(search("spent $25")).toEqual(["debit"]);
  expect(search("paid between $25 and $50")).toEqual(["debit", "more"]);
  expect(search("deposits $25 or 50")).toEqual(["fund", "larger"]);
  expect(search("deposits $25, $50 and $75")).toEqual(["fund", "larger", "max"]);
});

test("keeps posted amounts, card denominations and transaction alternatives independent", () => {
  const created_at = "2026-11-05T20:00:00Z";
  const product = { title: "$75 Amazon Gift Card", slug: "amazon-75-gift-card", retailer: "Amazon", image: "/gift-card.png" };
  const entries: LedgerEntryRow[] = [
    { id: "deposit", entry_type: "DEPOSIT", amount: 2500, created_at },
    { id: "refund", entry_type: "REFUND", amount: 2500, created_at, product },
    { id: "adjustment", entry_type: "CORRECTION", amount: 2500, created_at },
    { id: "small", entry_type: "REFUND", amount: 50, created_at },
    { id: "cents", entry_type: "REFUND", amount: 175, created_at },
    { id: "purchase", entry_type: "PURCHASE_DEBIT", amount: -2800, created_at, product },
    { id: "entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at, product },
  ];
  const search = (query: string) => searchLedger(entries, query, entry => ledgerDescription(entry.entry_type, entry.product?.title)).map(entry => entry.id);
  expect(search("paid one dollar")).toEqual(["entry"]);
  expect(search("transactions between 50 cents and $1")).toEqual(["small", "entry"]);
  expect(search(".50")).toEqual(["small"]);
  expect(search("50 cents")).toEqual(["small"]);
  expect(search("deposit or refund $25")).toEqual(["deposit", "refund"]);
  expect(search("deposit or adjustments")).toEqual(["deposit", "adjustment"]);
  expect(search("refunds from Amazon")).toEqual(["refund"]);
  expect(search("one dollar seventy-five cents")).toEqual(["cents"]);
  expect(search("$75 Amazon gift card -$28")).toEqual(["purchase"]);
  expect(search("$50 Amazon gift card -$28")).toEqual([]);
  expect(search("purchase option")).toEqual(["purchase"]);
  expect(search("100 cents")).toEqual(["entry"]);
  expect(search("50 cents or one dollar")).toEqual(["small", "entry"]);
  expect(search("$75 Amazon gift card amount: -$28")).toEqual(["purchase"]);
  expect(search("refund from Amazon of $25")).toEqual(["refund"]);
  expect(search("top-ups $25")).toEqual(["deposit"]);
  expect(search("completed deposits")).toEqual(["deposit"]);
  expect(search("posted transactions")).toEqual(entries.map(entry => entry.id));
  expect(search("50 cents, $1")).toEqual(["small", "entry"]);
  expect(search("transaction between $.50 and $1")).toEqual(["small", "entry"]);
  expect(search("Amazon gift card worth $75")).toEqual(["refund", "purchase", "entry"]);
  expect(search("between -$28 and -$1.00")).toEqual(["purchase", "entry"]);
});

test("searches the printed transaction date in the account's time zone", () => {
  const entry = { id: "credit", entry_type: "REFUND", amount: 100, created_at: "2026-11-06T02:00:00Z" };
  const search = (query: string) => searchLedger([entry], query, () => ["Refund"], [entry], { timeZone: "America/New_York", locale: "en-US" });
  expect(search("November 5")).toEqual([entry]);
  expect(search("Nov 5, 2026")).toEqual([entry]);
  expect(search("Nov 6")).toEqual([]);
});

test("keeps an amount alternative scoped to the transaction type and recognizes signed speech", () => {
  const created_at = "2026-11-05T20:00:00Z";
  const entries: LedgerEntryRow[] = [
    { id: "one", entry_type: "DEPOSIT", amount: 100, created_at },
    { id: "two", entry_type: "DEPOSIT", amount: 200, created_at },
    { id: "three", entry_type: "DEPOSIT", amount: 300, created_at },
    { id: "purchase", entry_type: "ENTRY_DEBIT", amount: -100, created_at },
    { id: "refund", entry_type: "REFUND", amount: 100, created_at },
    { id: "returned", entry_type: "UNCLAIMED_WINNER_CREDIT", amount: 100, created_at },
  ];
  const search = (query: string) => searchLedger(entries, query, entry =>
    ledgerDescription(entry.entry_type)).map(entry => entry.id);
  expect(search("Deposit $1 or $2")).toEqual(["one", "two"]);
  expect(search("minus one dollar")).toEqual(["purchase"]);
  expect(search("refunds")).toEqual(["refund", "returned"]);
  expect(search("entry purchases")).toEqual(["purchase"]);
  expect(search("Amount: $2.00")).toEqual(["two"]);
  expect(search("Posted amount: -$1.00")).toEqual(["purchase"]);
  expect(search("($1.00)")).toEqual(["purchase"]);
  expect(search("Funding")).toEqual(["one", "two", "three"]);
});

test("finds signed movements, exact dates and reservation states without changing history", () => {
  const created_at = "2026-11-06T01:00:00Z";
  const product = { title: "$75 Best Buy Gift Card", slug: "best-buy-75-gift-card", retailer: "Best Buy", image: "/gift-card.png" };
  const entries: LedgerEntryRow[] = [
    { id: "deposit", entry_type: "DEPOSIT", amount: 2500, created_at },
    { id: "refund", entry_type: "REFUND", amount: 2500, created_at, product },
    { id: "cents", entry_type: "CORRECTION", amount: 50, created_at },
    { id: "entry1", entry_type: "ENTRY_DEBIT", amount: -100, created_at, product },
    { id: "entry3", entry_type: "ENTRY_DEBIT", amount: -300, created_at },
    { id: "hold", entry_type: "ENTRY_HOLD", amount: -100, created_at, entryRequestId: "open" },
    { id: "prior", entry_type: "ENTRY_HOLD", amount: -100, created_at, entryRequestId: "closed" },
    { id: "release", entry_type: "ENTRY_HOLD_RELEASE", amount: 100, created_at, entryRequestId: "closed" },
    { id: "later", entry_type: "DEPOSIT", amount: 1000, created_at: "2026-11-07T06:00:00Z" },
  ];
  const search = (q: string) => searchLedger(entries, q, entry => ledgerDescription(entry.entry_type, entry.product?.title), entries, { timeZone: "America/New_York", locale: "en-US" }).map(entry => entry.id);
  expect(search("debits")).toEqual(["entry1", "entry3"]);
  expect(search("credits")).toEqual(["deposit", "refund", "cents", "later"]);
  expect(search("paid $1 from Best Buy")).toEqual(["entry1"]);
  expect(search("entries on Nov 5")).toEqual(["entry1", "entry3"]);
  expect(search("Nov 05")).toEqual(search("Nov 5"));
  expect(search("11/05/2026")).toEqual(search("Nov 5"));
  expect(search("November 5 to November 6")).toEqual(search("Nov 5"));
  expect(search("-$3–-$1")).toEqual(["entry1", "entry3", "hold", "prior"]);
  expect(search("under -$1")).toEqual(["entry3"]);
  expect(search("face value $75 Best Buy gift card")).toEqual(["refund", "entry1"]);
  expect(search("refunded $25")).toEqual(["refund"]);
  expect(search("pending holds")).toEqual(["hold"]);
  expect(search("released reservations")).toEqual(["release"]);
  expect(search("50c")).toEqual(["cents"]);
  expect(search("deposit $25 or refund $25")).toEqual(["deposit", "refund"]);
});
