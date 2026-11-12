import { expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { getCompleteLedgerHistory, getRecentLedgerHistory, ledgerProduct } from "./history";
import { createClient } from "@/lib/supabase/server";

const base = { id: "11111111-1111-4111-8111-111111111111", amount: -100, created_at: "2026-10-16T12:00:00Z" };
const requestId = "22222222-2222-4222-8222-222222222222";

test("debits use only their recorded pool, not a nearby transaction", () => {
  const item = ledgerProduct({ ...base, entry_type: "ENTRY_DEBIT", source_event: "preview_entry", related_pool_id: "preview_best-buy-100-gift-card" }, new Map(), new Map());
  expect(item).toMatchObject({ title: "$100 Best Buy Gift Card", image: "/catalog/best-buy-100-gift-card.svg", retailer: "Best Buy" });
  expect(ledgerProduct({ ...base, entry_type: "ENTRY_DEBIT", source_event: "preview_entry", related_pool_id: null }, new Map(), new Map())).toBeUndefined();
});

test("holds and releases require the matching owner-scoped request", () => {
  const release = { ...base, entry_type: "ENTRY_HOLD_RELEASE", source_event: `entry_request_${requestId}_ENTRY_HOLD_RELEASE`, related_pool_id: null };
  expect(ledgerProduct(release, new Map([[requestId, "best-buy-100-gift-card"]]), new Map())?.title).toBe("$100 Best Buy Gift Card");
  expect(ledgerProduct(release, new Map(), new Map())).toBeUndefined();
});

test("unlinked funding never borrows a product image", () => {
  expect(ledgerProduct({ ...base, entry_type: "DEPOSIT", source_event: "demo_funding", related_pool_id: null }, new Map(), new Map())).toBeUndefined();
});

test.each([false, true])("history resolves owner-scoped entries with a bounded notification window (recent: %s)", async recent => {
  const ids = Array.from({ length: 501 }, (_, index) => `ent_${index.toString(16).padStart(32, "0")}`);
  const hold = { ...base, entry_type: "ENTRY_HOLD", source_event: `entry_request_${requestId}_ENTRY_HOLD`, related_pool_id: null, related_entry_id: null };
  const debit = { ...base, id: "11111111-1111-4111-8111-111111111110", entry_type: "ENTRY_DEBIT", source_event: "preview_entry", related_pool_id: "preview_best-buy-100-gift-card", related_entry_id: ids[0] };
  const queries: { table: string; owner?: string; range?: number[] }[] = [];
  const fake = { from(table: string) {
    const query: (typeof queries)[number] = { table }; queries.push(query);
    const builder = {
      select: () => builder,
      eq: (column: string, value: string) => { if (column === "customer_id") query.owner = value; return builder; },
      in: () => builder,
      or: () => builder,
      order: () => builder,
      range: (from: number, to: number) => { query.range = [from, to]; return builder; },
      then: (resolve: (value: unknown) => unknown) => resolve({ error: null, data: table === "ledger_entries" ? [hold, debit]
        : table === "entry_requests" ? [{ id: requestId, offering_slug: "best-buy-100-gift-card" }]
          : ids.slice(query.range?.[0] ?? 0, (query.range?.[1] ?? 500) + 1).map(entry_id => ({ entry_id, entry_request_id: requestId })) }),
    };
    return builder;
  } };
  vi.mocked(createClient).mockResolvedValue(fake as unknown as Awaited<ReturnType<typeof createClient>>);
  const history = await (recent ? getRecentLedgerHistory : getCompleteLedgerHistory)("owner", { walletAccountId: "wallet", scope: "demo", currency: "USD", balanceCents: 100, fundingAvailable: true, entries: [hold, debit], transactionCount: recent ? 2000 : 2 });
  expect(history?.[0].entryIds).toEqual(ids);
  expect(queries.filter(query => query.table === "ledger_entries").map(query => query.range)).toEqual([[0, recent ? 1 : 2]]);
  expect(history?.[1].entryIds).toEqual([ids[0]]);
  expect(queries.every(query => query.owner === "owner")).toBe(true);
  expect(queries.filter(query => query.table === "customer_entries").map(query => query.range)).toEqual([[0, 499], [500, 999]]);
});

test.each(["new deposit", "late older deposit", "duplicate page row"])(
  "the full ledger read handles a %s between pages", async scenario => {
    const timestamp = "2026-11-09T12:00:00.123456+00:00";
    const rows = Array.from({ length: 501 }, (_, index) => ({
      id: `11111111-1111-4111-8111-${String(501 - index).padStart(12, "0")}`,
      created_at: timestamp, amount: 100, entry_type: "DEPOSIT", source_event: `deposit-${index}`, related_pool_id: null,
    }));
    const latest = { ...rows[0], id: "11111111-1111-4111-8111-000000000502" };
    const older = { ...rows[500], id: "11111111-1111-4111-8111-000000000000" };
    const queries: { filter?: string; range?: number[] }[] = [];
    const fake = { from() {
      const query: (typeof queries)[number] = {}; queries.push(query);
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        or: (filter: string) => { query.filter = filter; return builder; },
        range: (from: number, to: number) => { query.range = [from, to]; return builder; },
        then: (resolve: (value: unknown) => unknown) => {
          const data = queries.length === 1 ? rows : scenario === "late older deposit" ? [...rows, older] : [latest, ...rows];
          const cursor = queries.length === 1 ? rows[0].id : rows[499].id;
          const matching = scenario === "duplicate page row" && queries.length === 2 ? [rows[499]]
            : data.filter(row => row.id < cursor || (queries.length === 1 && row.id === cursor));
          return resolve({ error: null, data: matching.slice(query.range![0], query.range![1] + 1) });
        },
      };
      return builder;
    } };
    vi.mocked(createClient).mockResolvedValue(fake as unknown as Awaited<ReturnType<typeof createClient>>);
    const history = await getCompleteLedgerHistory("owner", {
      walletAccountId: "wallet", scope: "demo", currency: "USD", balanceCents: 50100, transactionCount: 501,
      fundingAvailable: true, entries: rows.slice(0, 50),
    });
    expect(queries).toEqual([
      { range: [0, 499], filter: `created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lte.${rows[0].id})` },
      { range: [0, 1], filter: `created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${rows[499].id})` },
    ]);
    if (scenario === "new deposit") expect(history?.map(row => row.id)).toEqual(rows.map(row => row.id));
    else expect(history).toBeNull();
  },
);
