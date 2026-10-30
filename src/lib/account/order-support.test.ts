import { expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrderSupportHref, walletTransactionHelpHref } from "./order-support";

const transactionId = "11111111-1111-4111-8111-111111111111";
function query(data: unknown, error: unknown = null) {
  const chain = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error }) };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}
function client(order: ReturnType<typeof query>, ledger = query(null)) {
  return { from: vi.fn((table: string) => table === "customer_orders" ? order : ledger) };
}

test("links the exact saved order event to its purchase debit with ownership on both reads", async () => {
  const order = query({ provider_event_id: "purchase-second-same-product" });
  const ledger = query({ id: transactionId });
  const db = client(order, ledger);
  expect(await getOrderSupportHref(db as unknown as SupabaseClient, "owner", "ord_second"))
    .toBe(`/support?transaction=${transactionId}#report-problem`);
  expect(order.eq.mock.calls).toEqual([["customer_id", "owner"], ["order_number", "ord_second"]]);
  expect(ledger.eq.mock.calls).toEqual([["customer_id", "owner"], ["source_event", "purchase-second-same-product"], ["entry_type", "PURCHASE_DEBIT"]]);
  expect(ledger.select).toHaveBeenCalledWith("id");
});

test.each([null, {}, { provider_event_id: "" }])("missing or unauthorized order falls back to transaction history: %j", async data => {
  const db = client(query(data));
  expect(await getOrderSupportHref(db as unknown as SupabaseClient, "owner", "ord_missing")).toBe(walletTransactionHelpHref);
  expect(db.from).toHaveBeenCalledTimes(1);
});

test.each([
  [null, null],
  [{ id: "invalid" }, null],
  [{ id: transactionId }, { message: "Ambiguous or unavailable payment" }],
])("missing, invalid or ambiguous ledger data never attaches a different payment", async (data, error) => {
  const db = client(query({ provider_event_id: "purchase" }), query(data, error));
  expect(await getOrderSupportHref(db as unknown as SupabaseClient, "owner", "ord_selected")).toBe(walletTransactionHelpHref);
});

test("read failures leave the wallet help route available", async () => {
  const db = { from: vi.fn(() => { throw new Error("Unavailable"); }) };
  expect(await getOrderSupportHref(db as unknown as SupabaseClient, "owner", "ord_selected")).toBe(walletTransactionHelpHref);
});
