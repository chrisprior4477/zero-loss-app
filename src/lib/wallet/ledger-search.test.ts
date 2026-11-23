import { expect, test } from "vitest";
import { searchLedger } from "./ledger-search";
import { ledgerDescription } from "./transaction-links";
import type { LedgerEntryRow } from "./snapshot";

test("combines statement language with exact dates, amount direction, and verified descriptions", () => {
  const product = { slug: "netflix-25-gift-card", title: "$25 Netflix Gift Card", retailer: "Netflix", image: "/card.png" };
  const created_at = "2026-11-06T02:25:30Z";
  const entries: LedgerEntryRow[] = [
    { id: "fund", entry_type: "DEPOSIT", amount: 100, created_at },
    { id: "other-card", entry_type: "DEPOSIT", amount: 2500, created_at: "2026-11-07T02:00:00Z" },
    { id: "purchase", entry_type: "PURCHASE_DEBIT", amount: -2400, created_at, product },
    { id: "entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at, product: { ...product, title: "PlayStation 5", retailer: "Best Buy" } },
    { id: "hold", entry_type: "ENTRY_HOLD", amount: -100, created_at },
    { id: "release", entry_type: "ENTRY_HOLD_RELEASE", amount: 100, created_at: "2026-11-06T04:00:00Z" },
  ];
  const search = (query: string) => searchLedger(entries, query, row => [...ledgerDescription(row.entry_type, row.product?.title),
    row.id === "fund" ? "Chase ending 1117" : row.id === "other-card" ? "Discover ending 5556" : ""],
  entries, { timeZone: "America/New_York", locale: "en-US" }).map(row => row.id);
  expect(search("posted amount under $2")).toEqual(["fund", "entry"]);
  expect(search("transactions with a posted amount of $1")).toEqual(["fund", "entry"]);
  expect(search("amount of $1")).toEqual(search("amount: $1"));
  expect(search("on 11/5")).toEqual(search("11/5/26"));
  expect(search("from Nov 5 to 6, 2026")).toEqual(entries.map(row => row.id));
  expect(search("transactions in November 2026")).toEqual(entries.map(row => row.id));
  expect(search("Thursday November 5 2026")).toEqual(search("11/5/26"));
  expect(search("Friday November 5 2026")).toEqual([]);
  expect(search("5th of November 2026")).toEqual(search("11/5/26"));
  expect(search("deposits before November 6, 2026")).toEqual(["fund"]);
  expect(search("entries since Nov 5 2026")).toEqual(["entry"]);
  expect(search("Nov 5 2026 at 9:25 PM")).toEqual(["fund", "purchase", "entry", "hold"]);
  expect(search("Nov 5 2026 at 9:26 PM")).toEqual([]);
  for (const query of ["exactly $24 paid Netflix", "Netflix was charged $24", "Netflix card charge of $24", "Netflix paid exactly twenty-four dollars", "Netflix orders", "bought Netflix"]) {
    expect(search(query), query).toEqual(["purchase"]);
  }
  for (const query of ["Chase deposits", "Chase ending 1117"]) expect(search(query), query).toEqual(["fund"]);
  expect(search("all wallet debits")).toEqual(["purchase", "entry"]);
  expect(search("entry purchases for PlayStation 5")).toEqual(["entry"]);
  expect(search("reversed holds")).toEqual(["release"]);
});

test("a date and posted amount are separate filters, and gift-card purchases exclude entry charges", () => {
  const product = { slug: "walmart-25-gift-card", title: "$25 Walmart Gift Card", retailer: "Walmart", image: "/card.png" };
  const entries: LedgerEntryRow[] = [
    { id: "purchase", entry_type: "PURCHASE_DEBIT", amount: -2400, created_at: "2026-11-06T02:00:00Z", product },
    { id: "entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-11-06T02:00:00Z", product },
    { id: "older-entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-10-06T02:00:00Z", product },
  ];
  const search = (term: string) => searchLedger(entries, term, row => ledgerDescription(row.entry_type, row.product?.title)).map(row => row.id);
  expect(search("November 2026 $1")).toEqual(["entry"]);
  expect(search("$1 November 2026")).toEqual(["entry"]);
  expect(search("gift card purchases from Walmart")).toEqual(["purchase"]);
  expect(search("Walmart gift card purchases")).toEqual(["purchase"]);
  expect(search("Walmart entry payments $1")).toEqual(["entry", "older-entry"]);
  expect(search("Walmart entry payments $25")).toEqual([]);
  expect(search("$25 Walmart entry payments")).toEqual([]);
});

test("matches amount, date and direction shorthand without treating held or unrelated amounts as charges", () => {
  const created_at = "2026-11-06T02:00:00Z";
  const later = "2026-11-07T12:00:00Z";
  const netflix = { slug: "netflix-gift-card", title: "$25 Netflix Gift Card", retailer: "Netflix", image: "/card.png" };
  const entries: LedgerEntryRow[] = [
    { id: "deposit", entry_type: "DEPOSIT", amount: 2500, created_at },
    { id: "credit", entry_type: "REFUND", amount: 3000, created_at: later },
    { id: "entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at, product: { slug: "playstation-5-slim", title: "PlayStation 5 Slim", retailer: "Best Buy", image: "/ps5.png" } },
    { id: "hold", entry_type: "ENTRY_HOLD", amount: -100, created_at },
    { id: "released", entry_type: "ENTRY_HOLD_RELEASE", amount: 300, created_at: "2026-10-25T20:00:00Z" },
    { id: "refund", entry_type: "REFUND", amount: 100, created_at },
    { id: "adjustment", entry_type: "CORRECTION", amount: -50, created_at },
    { id: "netflix", entry_type: "PURCHASE_DEBIT", amount: -2400, created_at, product: netflix },
    { id: "different-retailer", entry_type: "PURCHASE_DEBIT", amount: -2400, created_at },
    { id: "netflix-other-amount", entry_type: "PURCHASE_DEBIT", amount: -2300, created_at, product: netflix },
    { id: "title-only", entry_type: "ENTRY_DEBIT", amount: -300, created_at, product: { ...netflix, title: "$50 Netflix Gift Card" } },
  ];
  const search = (query: string) => searchLedger(entries, query, row => [...ledgerDescription(row.entry_type, row.product?.title), "Posted"],
    entries, { timeZone: "America/New_York", locale: "en-US" }).map(row => row.id);
  for (const query of ["$1 debit", "1.00 USD debit", "debits of $1", "$1 or $2 paid", "US$1.00 spent", "payment of $1"]) {
    expect(search(query), query).toEqual(["entry"]);
  }
  expect(search("$25 deposited")).toEqual(["deposit"]);
  expect(search("All entry payments")).toEqual(["entry", "title-only"]);
  for (const query of ["posted on 11/05/2026", "transactions on November 5", "11-05-2026", "11/5/26", "on Nov 5, 2026"]) {
    expect(search(query), query).toEqual(search("2026-11-05"));
  }
  expect(search("paid on Nov 5, 2026")).toEqual(["entry", "netflix", "different-retailer", "netflix-other-amount", "title-only"]);
  for (const query of ["Nov 5, 2026 Netflix", "Netflix Nov 5, 2026", "Netflix on November 5, 2026"]) {
    expect(search(query), query).toEqual(["netflix", "netflix-other-amount", "title-only"]);
  }
  expect(search("after Nov 5, 2026")).toEqual(["credit"]);
  expect(search("from 2026-11-01 until 2026-11-10")).toEqual(entries.filter(row => row.id !== "released").map(row => row.id));
  expect(search("entry hold released")).toEqual(["released"]);
  expect(search("$1 entry payment")).toEqual(["entry"]);
  expect(search("charged exactly $1")).toEqual(["entry"]);
  for (const query of ["November 5-6 2026", "11/5 through 11/6/26", "before Nov 7, 2026 and after Nov 4, 2026", "November 5 and November 6, 2026"]) {
    expect(search(query), query).toEqual(search("between Nov 5, 2026 and Nov 6, 2026"));
  }
  expect(search("Oct 26–Nov 5, 2026")).toEqual(search("between Oct 26, 2026 and Nov 5, 2026"));
  expect(search("$1 PlayStation entry payment")).toEqual(["entry"]);
  expect(search("PlayStation charged $1")).toEqual(["entry"]);
  expect(search("Netflix $24 paid")).toEqual(["netflix"]);
  expect(search("purchases $24 or $99 from Netflix")).toEqual(["netflix"]);
  expect(search("Netflix $24, posted")).toEqual(["netflix"]);
  expect(search("amount = -$1")).toEqual(["entry", "hold"]);
  expect(search("$1 exactly")).toEqual(["entry", "hold", "refund"]);
  expect(search("$1 to $2")).toEqual(["entry", "hold", "refund"]);
  expect(search("charges between $0.50 and $1")).toEqual(["entry", "adjustment"]);
  expect(search("wallet credit over $25")).toEqual(["credit"]);
  expect(search("-50¢")).toEqual(["adjustment"]);
  expect(search("Netflix card charge $24")).toEqual(["netflix"]);
  expect(search("Nov 5 2026 at $1")).toEqual(search("Nov 5, 2026 $1"));
  expect(search("11/5–11/6/26")).toEqual(search("between 11/5/26 and 11/6/26"));
  expect(search("November 5th through the 6th, 2026")).toEqual(search("between 11/5/26 and 11/6/26"));
  expect(search("posted amount: one dollar")).toEqual(["entry", "refund"]);
  expect(search("amount 100 cents")).toEqual(["entry", "hold", "refund"]);
  expect(search("deposit of at least $25")).toEqual(["deposit"]);
  expect(search("transactions older than November 1, 2026")).toEqual(["released"]);
  expect(search("posted entry payments")).toEqual(["entry", "title-only"]);
  expect(search("$1 entry debit on 11/5/26")).toEqual(["entry"]);
});

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
  expect(search("deposits $25 to $50")).toEqual(["fund", "larger"]);
  expect(search("$25 to $50 deposits")).toEqual(["fund", "larger"]);
  expect(search("deposit amount between $25 and $50")).toEqual(["fund", "larger"]);
  expect(search("funds added $25 to $50")).toEqual(["fund", "larger"]);
  expect(search("amount from $25 to $50")).toEqual(["fund", "larger", "debit", "more"]);
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
  expect(search("2026-11-05")).toEqual([entry]);
  expect(search("2026-11-06")).toEqual([]);
  expect(search("Nov 2026")).toEqual([entry]);
  expect(search("Nov 2025")).toEqual([]);
  expect(search("between November 1 and November 5")).toEqual([entry]);
  expect(search("between November 6 and November 10")).toEqual([]);
});

test("searches natural posted-amount and entry date wording", () => {
  const created_at = "2026-11-06T02:00:00Z";
  const product = { title: "PlayStation 5 Slim Model", slug: "playstation-5-slim", retailer: "Best Buy", image: "/item.png" };
  const entries: LedgerEntryRow[] = [
    { id: "deposit", entry_type: "DEPOSIT", amount: 2500, created_at },
    { id: "order", entry_type: "PURCHASE_DEBIT", amount: -2500, created_at },
    { id: "entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at, product },
    { id: "refund", entry_type: "REFUND", amount: 100, created_at },
  ];
  const search = (q: string) => searchLedger(entries, q, row => ledgerDescription(row.entry_type, row.product?.title),
    entries, { timeZone: "America/New_York", locale: "en-US" }).map(row => row.id);
  expect(search("$(1.00)")).toEqual(["entry"]);
  expect(search("entry purchases on November 5")).toEqual(["entry"]);
  expect(search("amount equals $1")).toEqual(["entry", "refund"]);
  expect(search("-$1 to -$0.50")).toEqual(["entry"]);
  expect(search("refunds or purchases $1")).toEqual(["entry", "refund"]);
  expect(search("$1.00 or less")).toEqual(["entry", "refund"]);
  expect(search("orders for $25")).toEqual(["order"]);
  expect(search("deposit greater than $10")).toEqual(["deposit"]);
  expect(search("PlayStation 5 and $1.00")).toEqual(["entry"]);
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
