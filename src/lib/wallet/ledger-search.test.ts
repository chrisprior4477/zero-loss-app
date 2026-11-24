import { expect, test } from "vitest";
import { searchLedger } from "./ledger-search";
import { ledgerDescription } from "./transaction-links";
import type { LedgerEntryRow } from "./snapshot";

test("matches deposit card metadata, order references, and compound payment searches", () => {
  const date = "2026-11-06T02:05:00Z";
  const netflix = { slug: "netflix-25-gift-card", title: "$25 Netflix Gift Card", retailer: "Netflix", image: "/netflix.png" };
  const walmart = { slug: "walmart-100-gift-card", title: "$100 Walmart Gift Card", retailer: "Walmart", image: "/walmart.png" };
  const playstation = { slug: "ps5", title: "PlayStation 5", retailer: "Best Buy", image: "/ps5.png" };
  const rows: LedgerEntryRow[] = [
    { id: "deposit-chase", entry_type: "DEPOSIT", amount: 16000, created_at: date },
    { id: "deposit-other", entry_type: "DEPOSIT", amount: 5500, created_at: "2026-11-03T20:00:00Z" },
    { id: "deposit-discover", entry_type: "DEPOSIT", amount: 16000, created_at: "2026-11-03T21:00:00Z" },
    { id: "netflix", entry_type: "PURCHASE_DEBIT", amount: -2400, product: netflix, orderNumber: "ord_f36ac615abcdef90", created_at: date },
    { id: "netflix-less", entry_type: "PURCHASE_DEBIT", amount: -2300, product: netflix, created_at: date },
    { id: "walmart", entry_type: "PURCHASE_DEBIT", amount: -9900, product: walmart, created_at: date },
    { id: "reference-be3ca77a", entry_type: "ENTRY_DEBIT", amount: -100, product: playstation, created_at: date },
    { id: "hold", entry_type: "ENTRY_HOLD", amount: -100, product: playstation, created_at: date },
    { id: "release", entry_type: "ENTRY_HOLD_RELEASE", amount: 100, product: playstation, created_at: date },
    { id: "refund", entry_type: "REFUND", amount: 500, created_at: "2026-10-28T20:00:00Z" },
  ];
  const search = (query: string) => searchLedger(rows, query, row => [...ledgerDescription(row.entry_type, row.product?.title),
    row.id === "deposit-chase" ? "Chase ending 1117" : row.id === "deposit-discover" ? "Discover ending 5556" : ""], rows,
  { timeZone: "America/New_York", locale: "en-US", now: new Date("2026-11-23T12:00:00Z"),
    hasDepositReceipt: row => row.id === "deposit-chase" || row.id === "deposit-discover",
  }).map(row => row.id);
  expect(search("card ending 1117")).toEqual(["deposit-chase"]);
  expect(search("deposits by Chase")).toEqual(["deposit-chase"]);
  expect(search("transaction ref ending BE3CA77A")).toEqual(["reference-be3ca77a"]);
  expect(search("order number ending ABCDEF90")).toEqual(["netflix"]);
  expect(search("ord_f36ac615abcdef90")).toEqual(["netflix"]);
  expect(search("deposits in the last 30 days")).toEqual(["deposit-chase", "deposit-other", "deposit-discover"]);
  expect(search("transactions this month")).toEqual(rows.filter(row => row.id !== "refund").map(row => row.id));
  expect(search("deposits from Nov 2nd to the 5th")).toEqual(["deposit-chase", "deposit-other", "deposit-discover"]);
  expect(search("deposits over $50 that posted in November 2026")).toEqual(["deposit-chase", "deposit-other", "deposit-discover"]);
  expect(search("refunds or released reservations")).toEqual(["release", "refund"]);
  expect(search("purchase for Netflix under $24")).toEqual(["netflix-less"]);
  expect(search("spent no more than $99 at Walmart")).toEqual(["walmart"]);
  expect(search("paid $24 at Netflix or $99 at Walmart")).toEqual(["netflix", "walmart"]);
  expect(search("exactly $1 for PlayStation")).toEqual(["reference-be3ca77a"]);
  expect(search("Nov 5 after 8 pm")).toEqual(rows.filter(row => row.created_at === date).map(row => row.id));
  expect(search("deposits other than $160")).toEqual(["deposit-other"]);
  expect(search("deposits $160 but not from Discover")).toEqual(["deposit-chase"]);
  expect(search("posted order payments")).toEqual(["netflix", "netflix-less", "walmart"]);
  expect(search("transactions excluding reservations")).toEqual(rows.filter(row => !["hold", "release"].includes(row.id)).map(row => row.id));
  expect(search("transactions other than deposits")).toEqual(rows.filter(row => row.entry_type !== "DEPOSIT").map(row => row.id));
  expect(search("purchases excluding Walmart")).toEqual(["netflix", "netflix-less", "reference-be3ca77a"]);
  expect(search("orders only")).toEqual(search("posted order payments"));
  expect(search("funding and purchases")).toEqual(search("funding or purchases"));
  expect(search("show me deposits over $50")).toEqual(search("deposits over $50"));
  expect(search("November deposits")).toEqual(search("November 2026 deposits"));
  expect(search("from Nov 2 to Nov 5 deposits")).toEqual(["deposit-chase", "deposit-other", "deposit-discover"]);
  expect(search("last 30 days PlayStation")).toEqual(["reference-be3ca77a", "hold", "release"]);
  expect(search("deposits after 8 pm on Nov 5")).toEqual(["deposit-chase"]);
  expect(search("posted charges at Netflix greater than $23")).toEqual(["netflix"]);
  expect(search("Netflix payments of exactly $24")).toEqual(["netflix"]);
  expect(search("Netflix order cost less than $24")).toEqual(["netflix-less"]);
  expect(search("entry payment of one dollar for PlayStation")).toEqual(["reference-be3ca77a"]);
  expect(search("my last funding receipt")).toEqual(["deposit-chase"]);
  expect(search("deposits using the card ending 1117")).toEqual(["deposit-chase"]);
  expect(search("ref BE3CA77A")).toEqual(["reference-be3ca77a"]);
  expect(search("ABCDEF90")).toEqual(["netflix"]);
  expect(search("funding during November")).toEqual(["deposit-chase", "deposit-other", "deposit-discover"]);
  expect(search("deposit after November 4 before November 7")).toEqual(["deposit-chase"]);
  expect(search("deposits before noon on Nov 3")).toEqual([]);
  expect(search("deposits before noon on Nov 5")).toEqual(search("deposits on Nov 5 before 12 pm"));
  expect(search("transactions Nov 5 after 20:00")).toEqual(search("Nov 5 after 8 pm"));
  expect(search("deposits from Nov 2 through Nov 5 inclusive")).toEqual(["deposit-chase", "deposit-other", "deposit-discover"]);
  expect(search("eighteen days ago transactions")).toEqual(search("Nov 5"));
  expect(search("deposits this year")).toEqual(["deposit-chase", "deposit-other", "deposit-discover"]);
  expect(search("orders in the past thirty days")).toEqual(["netflix", "netflix-less", "walmart"]);
  expect(search("November 5 through November 12 PlayStation")).toEqual(["reference-be3ca77a", "hold", "release"]);
  expect(search("funding received on Chase ending 1117")).toEqual(["deposit-chase"]);
  expect(search("deposit receipt from Chase ending in 1117")).toEqual(["deposit-chase"]);
  expect(search("deposit receipt from Discover ending in 1117")).toEqual([]);
  expect(search("PlayStation entry purchases without temporary holds")).toEqual(["reference-be3ca77a"]);
  expect(search("Nov 5 entries that actually posted")).toEqual(["reference-be3ca77a"]);
  expect(search("PlayStation negative $1 charges")).toEqual(["reference-be3ca77a"]);
  expect(search("all funding except Chase")).toEqual(["deposit-discover"]);
  expect(search("funding receipt from Chase ending in 1117")).toEqual(["deposit-chase"]);
  expect(search("Chase receipts from Nov 5")).toEqual(["deposit-chase"]);
  expect(search("Chase receipts from Nov 3")).toEqual([]);
  expect(search("PlayStation entry charges of exactly $1")).toEqual(["reference-be3ca77a"]);
  expect(search("November 5 entries excluding holds")).toEqual(["reference-be3ca77a"]);
  expect(search("Nov 5 confirmed entry charges")).toEqual(["reference-be3ca77a"]);
  expect(search("charges for entries only")).toEqual(["reference-be3ca77a"]);
  expect(search("all deposits made with a card ending in 1117")).toEqual(["deposit-chase"]);
  expect(search("all deposits on November 5 except Wells Fargo")).toEqual(["deposit-chase"]);
  expect(search("deposits excluding Wells Fargo on Nov 5")).toEqual(["deposit-chase"]);
  expect(search("deposits excluding Chase on Nov 5")).toEqual([]);
  expect(search("deposits from the Chase card ending in 1117")).toEqual(["deposit-chase"]);
  expect(search("deposits from the Discover card ending in 1117")).toEqual([]);
  expect(search("Chase deposits excluding anything above $50")).toEqual([]);
  expect(search("Chase deposits excluding anything above $160")).toEqual(["deposit-chase"]);
  expect(search("PlayStation entry payments over the last 30 days")).toEqual(["reference-be3ca77a"]);
  expect(search("PlayStation reservation holds, no posted charge")).toEqual(["hold"]);
  expect(search("payments for PlayStation entries only")).toEqual(["reference-be3ca77a"]);
  expect(search("$1 PlayStation charges after Nov 4")).toEqual(["reference-be3ca77a"]);
  expect(search("receipts for Discover card ending 5556")).toEqual(["deposit-discover"]);
  expect(search("order no. ABCDEF90")).toEqual(["netflix"]);
  expect(search("posted entry costs $1 for PlayStation")).toEqual(["reference-be3ca77a"]);
  expect(search("Netflix charge of $24")).toEqual(["netflix"]);
  expect(search("Netflix and Walmart orders")).toEqual(["netflix", "netflix-less", "walmart"]);
  expect(search("Netflix payment $24 or $23")).toEqual(["netflix", "netflix-less"]);
  expect(search("entry holds only")).toEqual(["hold"]);
  expect(search("latest Walmart order")).toEqual(["walmart"]);
  expect(search("last $160 funding receipt")).toEqual(["deposit-chase"]);
  expect(search("funding from any card but Discover")).toEqual(["deposit-chase"]);
  expect(search("only $160 in funding")).toEqual(["deposit-chase", "deposit-discover"]);
});

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
  expect(search("posted amounts under $2")).toEqual(["fund", "entry"]);
  expect(search("transactions with posted amounts of $1")).toEqual(["fund", "entry"]);
  expect(search("transactions posted after Nov 5 2026")).toEqual(["other-card"]);
  expect(search("Netflix purchase on Nov 5")).toEqual(["purchase"]);
  expect(search("paid $24 for Netflix")).toEqual(["purchase"]);
  expect(search("$1 entry charges")).toEqual(["entry"]);
  expect(search("one dollar entry charges")).toEqual(["entry"]);
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
    entries, { timeZone: "America/New_York", locale: "en-US", now: new Date("2026-11-24T12:00:00Z") }).map(row => row.id);
  for (const query of ["$1 debit", "1.00 USD debit", "debits of $1", "$1 or $2 paid", "US$1.00 spent", "payment of $1"]) {
    expect(search(query), query).toEqual(["entry"]);
  }
  expect(search("$25 deposited")).toEqual(["deposit"]);
  expect(search("All entry payments")).toEqual(["entry", "title-only"]);
  for (const query of ["transactions on November 5", "11-05-2026", "11/5/26", "on Nov 5, 2026"]) {
    expect(search(query), query).toEqual(search("2026-11-05"));
  }
  expect(search("posted on 11/05/2026")).toEqual(search("transactions posted on Nov 5, 2026"));
  expect(search("posted on 11/05/2026")).not.toContain("hold");
  expect(search("entry $1 posted after Nov 4, 2026")).toEqual(["entry"]);
  expect(search("funding or purchase transactions on Nov 5, 2026")).toEqual(search("funding or purchases on Nov 5, 2026"));
  expect(search("transactions between Nov 5 and 7, 2026")).toEqual(search("Nov 5–7, 2026"));
  expect(search("deposit receipt $25")).toEqual(["deposit"]);
  expect(search("deposits last 30 days")).toEqual(["deposit"]);
  expect(search("deposits during November 2026")).toEqual(["deposit"]);
  expect(search("Netflix paid more than $23")).toEqual(["netflix"]);
  expect(search("spent exactly $24 at Netflix")).toEqual(["netflix"]);
  expect(search("Netflix purchased for $24")).toEqual(["netflix"]);
  expect(search("release of $3")).toEqual(["released"]);
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

test("composes Wallet date, scope, and exact debit queries", () => {
  const product = { title: "PlayStation 5 Slim Model", slug: "playstation-5-slim", retailer: "Best Buy", image: "/item.png" };
  const entries: LedgerEntryRow[] = [
    { id: "deposit", entry_type: "DEPOSIT", amount: 16000, created_at: "2026-11-06T02:05:00Z" },
    { id: "old", entry_type: "DEPOSIT", amount: 2000, created_at: "2026-10-10T15:00:00Z" },
    { id: "hold", entry_type: "ENTRY_HOLD", amount: -100, created_at: "2026-11-14T20:00:00Z", product },
    { id: "release", entry_type: "ENTRY_HOLD_RELEASE", amount: 100, created_at: "2026-11-21T20:00:00Z", product },
    { id: "purchase", entry_type: "PURCHASE_DEBIT", amount: -9900, created_at: "2026-11-18T15:00:00Z", product },
  ];
  const search = (query: string) => searchLedger(entries, query, row => [
    ...ledgerDescription(row.entry_type, row.product?.title), row.product?.retailer ?? "",
  ], entries, { timeZone: "America/New_York", locale: "en-US", now: new Date("2026-11-23T20:00:00Z") }).map(row => row.id);

  expect(search("Nov 5 at 9:05 PM PST")).toEqual([]);
  expect(search("Nov 5 at 6:05 PM PST")).toEqual(["deposit"]);
  expect(search("deposits on Nov 5, 2026 at 9:05 PM")).toEqual(["deposit"]);
  expect(search("deposits from Nov 2 to Nov 5")).toEqual(["deposit"]);
  expect(search("PlayStation from Nov 5 to Nov 21")).toEqual(["hold", "release", "purchase"]);
  expect(search("spent $99 on Best Buy")).toEqual(["purchase"]);
  expect(search("last 30 days")).toEqual(["deposit", "hold", "release", "purchase"]);
  expect(search("all transactions before November 5, 2026")).toEqual(["old"]);
  expect(search("transactions on or after 11/5")).toEqual(["deposit", "hold", "release", "purchase"]);
  expect(search("Nov 5 or Nov 21")).toEqual(["deposit", "release"]);
  expect(search("entry reservations")).toEqual(["hold"]);
  expect(search("entry reservation releases")).toEqual(["release"]);
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

test("keeps wallet searches scoped to their posted record type, card, amount and dates", () => {
  const created_at = "2026-11-06T02:05:00Z";
  const playstation = { title: "PlayStation 5 Slim", slug: "playstation-5-slim", retailer: "Best Buy", image: "/item.png" };
  const netflix = { ...playstation, title: "$25 Netflix Gift Card", slug: "netflix-25-gift-card", retailer: "Netflix" };
  const walmart = { ...playstation, title: "$100 Walmart Gift Card", slug: "walmart-100-gift-card", retailer: "Walmart" };
  const entries: LedgerEntryRow[] = [
    { id: "deposit", entry_type: "DEPOSIT", amount: 16000, created_at },
    { id: "wells", entry_type: "DEPOSIT", amount: 5000, created_at: "2026-11-03T15:00:00Z" },
    { id: "day-four", entry_type: "DEPOSIT", amount: 2500, created_at: "2026-11-04T15:00:00Z" },
    { id: "entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at, product: playstation },
    { id: "big-entry", entry_type: "ENTRY_DEBIT", amount: -200, created_at, product: playstation },
    { id: "later-entry", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-11-22T15:00:00Z", product: playstation },
    { id: "hold", entry_type: "ENTRY_HOLD", amount: -100, created_at, product: playstation },
    { id: "release", entry_type: "ENTRY_HOLD_RELEASE", amount: 100, created_at, product: playstation },
    { id: "netflix", entry_type: "PURCHASE_DEBIT", amount: -2400, created_at, product: netflix },
    { id: "walmart", entry_type: "PURCHASE_DEBIT", amount: -9900, created_at, orderNumber: "ord_1a514c4f", product: walmart },
    { id: "mismatched-walmart", entry_type: "PURCHASE_DEBIT", amount: -2400, created_at, product: walmart },
    { id: "refund", entry_type: "REFUND", amount: 250, created_at },
    { id: "correction", entry_type: "CORRECTION", amount: 300, created_at },
  ];
  const search = (query: string) => searchLedger(entries, query, row => [
    ...ledgerDescription(row.entry_type, row.product?.title),
    row.id === "deposit" ? "Chase •••• 1117" : row.id === "wells" ? "Wells Fargo •••• 0002" : "",
  ], entries, { timeZone: "America/New_York", locale: "en-US", now: new Date("2026-11-24T20:00:00Z"), hasDepositReceipt: row => row.id === "deposit" }).map(row => row.id);
  expect(search("1 USD PlayStation posted")).toEqual(["entry", "later-entry"]);
  expect(search("paid Netflix $24 or Walmart $99")).toEqual(["netflix", "walmart"]);
  expect(search("orders for the Netflix $25 gift card")).toEqual(["netflix"]);
  expect(search("deposits made without Wells Fargo")).toEqual(["deposit"]);
  expect(search("entries since Nov 5 but before November 7")).toEqual(["entry", "big-entry"]);
  expect(search("between Nov 2 and 5 funding")).toEqual(["deposit", "wells", "day-four"]);
  expect(search("deposits on both Nov 3 and Nov 5")).toEqual(["deposit", "wells"]);
  expect(search("after 8 pm on Nov 5 entry payments")).toEqual(["entry", "big-entry"]);
  expect(search("Nov deposits from Chase")).toEqual(["deposit"]);
  expect(search("November funding after 8 pm")).toEqual(["deposit"]);
  expect(search("show entries since Nov 21")).toEqual(["later-entry"]);
  expect(search("purchases made on Nov 5")).toEqual(search("purchases on Nov 5"));
  expect(search("purchases made on Nov 5")).toContain("netflix");
  expect(search("released holds for PlayStation")).toEqual(["release"]);
  expect(search("per ticket amount $1 PlayStation")).toEqual(["entry", "later-entry"]);
  expect(search("entry payments lower than $2 for PlayStation")).toEqual(["entry", "later-entry"]);
  expect(search("only charges from Netflix and Walmart")).toEqual(["netflix", "walmart", "mismatched-walmart"]);
  expect(search("deposits just over 50 dollars")).toEqual(["deposit"]);
  expect(search("Walmart order number 1A514C4F")).toEqual(["walmart"]);
  expect(search("Netflix order number 1A514C4F")).toEqual([]);
  expect(search("deposit receipts for the card ending 1117")).toEqual(["deposit"]);
  expect(search("receipts for my Chase ending in 1117")).toEqual(["deposit"]);
  expect(search("deposit receipts for the card ending 0002")).toEqual([]);
  expect(search("deposits paid with Chase ending 1117")).toEqual(["deposit"]);
  expect(search("wallet top ups from cards other than Chase")).toEqual(["wells"]);
  expect(search("deposits through Nov 5")).toEqual(["deposit", "wells", "day-four"]);
  expect(search("deposits as of Nov 5, inclusive")).toEqual(["deposit", "wells", "day-four"]);
  expect(search("funding beginning Nov 5")).toEqual(["deposit"]);
  expect(search("funding on November 3rd or the 5th")).toEqual(["deposit", "wells"]);
  expect(search("transactions in Nov 2026 with 9:05 PM on the clock")).toEqual(search("Nov 2026 at 9:05 PM"));
  expect(search("Nov 5 through Nov 6 only deposits")).toEqual(["deposit"]);
  expect(search("PlayStation reservation releases on Nov 5")).toEqual(["release"]);
  expect(search("PlayStation only posted ticket charges")).toEqual(["entry", "big-entry", "later-entry"]);
  expect(search("all transactions apart from deposits")).toEqual(search("transactions excluding deposits"));
  expect(search("exclude holds from my transactions")).toEqual(search("transactions excluding holds"));
  expect(search("refunds and corrections only, over $1")).toEqual(["refund", "correction"]);
  expect(search("refunds & corrections")).toEqual(["refund", "correction"]);
  expect(search("funding of no less than 50 USD")).toEqual(["deposit", "wells"]);
  expect(search("deposits with an amount at most $25")).toEqual(["day-four"]);
  expect(search("$24 actually paid for Netflix")).toEqual(["netflix"]);
  expect(search("CVS or Netflix purchase payments less than $50")).toEqual(["netflix"]);
  expect(search("transactions below negative 50 dollars")).toEqual(["walmart"]);
  expect(search("find the $160 payment receipt")).toEqual(["deposit"]);
  expect(search("purchases from Netflix that posted on Nov 5")).toEqual(["netflix"]);
  expect(search("Chase card deposits on November 5")).toEqual(["deposit"]);
  expect(search("deposits from Nov 5, not Discover")).toEqual(["deposit"]);
  expect(search("deposits from Nov 5, not Chase")).toEqual([]);
  expect(search("Chase funding of exactly $160")).toEqual(["deposit"]);
  expect(search("Chase deposits of $160 and $50 only")).toEqual(["deposit"]);
  expect(search("PlayStation reservations that were released")).toEqual(["release"]);
  expect(search("posted PlayStation charges minus $1")).toEqual(["entry", "later-entry"]);
  expect(search("all purchases over the last week")).toEqual(["later-entry"]);
  expect(search("funding transactions other than $160")).toEqual(["wells", "day-four"]);
  expect(search("all deposits except the ones for $160")).toEqual(["wells", "day-four"]);
  expect(search("Netflix orders paid on November 5")).toEqual(["netflix"]);
  expect(search("show my $160 Chase deposits on Nov 5")).toEqual(["deposit"]);
  expect(search("deposits on November 5 other than Discover")).toEqual(["deposit"]);
  expect(search("PlayStation entry reservations released before November 6")).toEqual(["release"]);
  expect(search("PlayStation entries without pending reservations")).toEqual(["entry", "big-entry", "later-entry"]);
  expect(search("PlayStation ticket charges from the last 7 days")).toEqual(["later-entry"]);
  expect(search("deposits on Nov 5, excluding $160")).toEqual([]);
  expect(search("Chase deposits on Nov 5 except those for $50")).toEqual(["deposit"]);
  expect(search("deposits that posted November 5")).toEqual(["deposit"]);
  expect(search("only PlayStation entry payments posted on Nov 5")).toEqual(["entry", "big-entry"]);
  expect(search("deposits using Chase over $1")).toEqual(["deposit"]);
  expect(search("Best Buy payment posted on Nov 5 for $1")).toEqual(["entry"]);
  expect(search("netflix charges before November 6")).toEqual(["netflix"]);
  expect(search("funding on Nov 5 after 7:30 in the evening")).toEqual(["deposit"]);
  expect(search("deposits made on November 5 on my Chase card")).toEqual(["deposit"]);
  expect(search("deposits on November 5 that were more than $1")).toEqual(["deposit"]);
  expect(search("deposits from Nov 2 through Nov 5 except $1 amounts")).toEqual(["deposit", "wells", "day-four"]);
  expect(search("deposits from Nov 2 through Nov 5 excluding $50 amounts")).toEqual(["deposit", "day-four"]);
  expect(search("receipt for my Chase deposit from November 5")).toEqual(["deposit"]);
  expect(search("PlayStation ticket charges since Nov 5")).toEqual(["entry", "big-entry", "later-entry"]);
  expect(search("Best Buy exact posted $1 charges")).toEqual(["entry", "later-entry"]);
  expect(search("funds added on Nov 5 after 7.30pm")).toEqual(["deposit"]);
  expect(search("Chase deposits on Nov 5 between 9:00 pm and 10:00 pm")).toEqual(["deposit"]);
  expect(search("Chase deposits on Nov 5 between 9:00 and 10:00 pm")).toEqual(["deposit"]);
  expect(search("Chase deposits on Nov 5 between 9:05 pm and 9:05 pm")).toEqual(["deposit"]);
  expect(search("Chase deposits on Nov 5 between 10:00 pm and 9:00 pm")).toEqual([]);
  expect(search("Chase deposits on Nov 5 between 9:06 pm and 10:00 pm")).toEqual([]);
  expect(search("what was my last Chase deposit")).toEqual(["deposit"]);
  expect(search("latest Chase deposit receipt")).toEqual(["deposit"]);
  expect(search("latest Wells Fargo deposit receipt")).toEqual([]);
  expect(search("November 5 funding on the card that ends in 1117")).toEqual(["deposit"]);
  expect(search("deposits on Nov 5 using the card ending in 1117")).toEqual(["deposit"]);
  expect(search("Chase funding from 11/5/26 after 7:30pm")).toEqual(["deposit"]);
  expect(search("Chase transactions that are credits on Nov 5")).toEqual(["deposit"]);
  expect(search("what did I spend on PlayStation entries on Nov 5")).toEqual(["entry", "big-entry"]);
  expect(search("posted purchases between Nov 4 and Nov 6 from Netflix")).toEqual(["netflix"]);
  expect(search("which deposits were more than a dollar on Nov 5")).toEqual(["deposit"]);
  expect(search("deposits over $1 that actually posted on Nov 5")).toEqual(["deposit"]);
  expect(search("card receipts for $160 of funding")).toEqual(["deposit"]);
  expect(search("what did I deposit on November 5")).toEqual(["deposit"]);
  expect(search("deposits that went through on 11/5")).toEqual(["deposit"]);
  expect(search("no Discover deposits on November 5")).toEqual(["deposit"]);
  expect(search("no Chase deposits on November 5")).toEqual([]);
  expect(search("PlayStation charges without the reservations")).toEqual(["entry", "big-entry", "later-entry"]);
  expect(search("only the posted entries for PlayStation between Nov 4 and Nov 6")).toEqual(["entry", "big-entry"]);
  expect(search("my Chase funding on Nov 5 after 7:30 p.m.")).toEqual(["deposit"]);
  expect(search("Chase deposits on November 5 after 7:30 at night")).toEqual(["deposit"]);
  expect(search("Chase deposits earlier than Nov 6")).toEqual(["deposit"]);
  expect(search("Chase deposits earlier than Nov 5")).toEqual([]);
  expect(search("only orders at Netflix that cleared on November 5")).toEqual(["netflix"]);
  expect(search("money added with my Chase card during November 2026")).toEqual(["deposit"]);
});
