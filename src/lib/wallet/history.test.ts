import { expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { ledgerProduct } from "./history";

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
