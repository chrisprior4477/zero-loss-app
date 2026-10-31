import { expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { getCompleteLedgerHistory, getRecentLedgerHistory, ledgerProduct } from "./history";
import { createClient } from "@/lib/supabase/server";

const base = { id: "11111111-1111-4111-8111-111111111111", amount: -100, created_at: "2026-10-16T12:00:00Z" };
const requestId = "22222222-2222-4222-8222-222222222222";

test("debits use only their recorded pool, not a nearby transaction", () => {
  const item = ledgerProduct({ ...base, entry_type: "ENTRY_DEBIT", source_event: "preview_entry", related_pool_id: "preview_best-buy-100-gift-card" }, new Map(), new Map());
  expect(item).toMatchObject({ title: "$100 Best Buy Gift Card", image: "/catalog/best-buy-100-gift-card.svg" });
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
  const debit = { ...base, id: "debit", entry_type: "ENTRY_DEBIT", source_event: "preview_entry", related_pool_id: "preview_best-buy-100-gift-card", related_entry_id: ids[0] };
  const queries: { table: string; owner?: string; range?: number[] }[] = [];
  const fake = { from(table: string) {
    const query: (typeof queries)[number] = { table }; queries.push(query);
    const builder = {
      select: () => builder,
      eq: (column: string, value: string) => { if (column === "customer_id") query.owner = value; return builder; },
      in: () => builder,
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
  expect(queries.filter(query => query.table === "ledger_entries").map(query => query.range)).toEqual([[0, 1]]);
  expect(history?.[1].entryIds).toEqual([ids[0]]);
  expect(queries.every(query => query.owner === "owner")).toBe(true);
  expect(queries.filter(query => query.table === "customer_entries").map(query => query.range)).toEqual([[0, 499], [500, 999]]);
});
