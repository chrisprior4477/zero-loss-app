import { expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DemoPaymentProvider } from "./demo-provider";
test("the deposit preference is persisted independently using safe fixture metadata", async () => {
  const card={token:"demo_card_1117",lastFour:"1117",isDefault:false,isDepositDefault:true};
  const rpc=vi.fn().mockResolvedValue({data:card});
  await expect(new DemoPaymentProvider({rpc} as unknown as SupabaseClient).savePaymentMethod(false,"demo_card_1117",undefined,true)).resolves.toEqual(card);
  expect(rpc).toHaveBeenCalledWith("save_demo_card_preferences",{p_payment_method:"demo_card_1117",p_make_default:false,p_make_deposit_default:true});
});
test("invalid provider response cannot reach the event consumer", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { status: "succeeded" } });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).finishFunding("request")).rejects.toThrow();
  expect(rpc).toHaveBeenCalledTimes(1);
});
test("duplicate payment acknowledgement is not reported as a new credit", async () => {
  const rpc = vi.fn().mockResolvedValueOnce({ data: { body: "receipt", signature: "signature" } })
    .mockResolvedValueOnce({ data: { status: "succeeded", sessionId: "request", duplicate: true } });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).finishFunding("request")).resolves.toEqual({ alreadyCredited: true });
});
test.each([null, {}, [{ id: "a", amount: 0, currency: "USD", created_at: "2026-09-14", reconciliation: "reconciled" }]])("malformed request data never becomes an empty list", async data => {
  const rpc = vi.fn().mockResolvedValue({ data });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).getRequests()).rejects.toThrow();
});

test("large deposits stay readable in owner history and recovery", async () => {
  const request = { id: "request-large", amount: 1000000, currency: "USD", status: "succeeded", created_at: "2026-10-22T20:00:00Z", idempotencyKey: "large_request_key_01", reconciliation: "reconciled" };
  const rpc = vi.fn().mockResolvedValue({ data: [request] });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).getRequests()).resolves.toEqual([request]);
});

test("owner request history includes the original retry key and rejects a missing one", async () => {
  const request = { id: "request-1", amount: 2500, currency: "USD", status: "succeeded", created_at: "2026-10-14T20:00:00Z", idempotencyKey: "original_request_key_01", reconciliation: "reconciled" };
  const rpc = vi.fn().mockResolvedValueOnce({ data: [request] }).mockResolvedValueOnce({ data: [{ ...request, idempotencyKey: undefined }] });
  const provider = new DemoPaymentProvider({ rpc } as unknown as SupabaseClient);
  await expect(provider.getRequests()).resolves.toEqual([request]);
  await expect(provider.getRequests()).rejects.toThrow("Invalid funding request list");
});

test.each([undefined, {}, { token: "other", lastFour: "4242", isDefault: true }, { token: "demo_card_4242", lastFour: "4242", isDefault: "true" }])("malformed saved card fails closed", async data => {
  const rpc = vi.fn().mockResolvedValue({ data });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).getPaymentMethod()).rejects.toThrow();
});

test.each([null, { token: "demo_card_4242", lastFour: "4242", isDefault: true }])("reads only safe saved-card metadata", async data => {
  const rpc = vi.fn().mockResolvedValue({ data });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).getPaymentMethod()).resolves.toEqual(data);
});

test("saves only the fixed test token and returns validated metadata", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { token: "demo_card_4242", lastFour: "4242", isDefault: true } });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).savePaymentMethod(true)).resolves.toEqual({ token: "demo_card_4242", lastFour: "4242", isDefault: true });
  expect(rpc).toHaveBeenCalledWith("save_demo_payment_method", { p_payment_method: "demo_card_4242", p_make_default: true });
});

test("unconfirmed save response fails closed", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: null });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).savePaymentMethod(false)).rejects.toThrow("Unconfirmed");
});

test("card removal requires a confirmed database response", async () => {
  const rpc = vi.fn().mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: null });
  const provider = new DemoPaymentProvider({ rpc } as unknown as SupabaseClient);
  await expect(provider.deletePaymentMethod("demo_card_4242")).resolves.toBeUndefined();
  expect(rpc).toHaveBeenCalledWith("delete_demo_payment_method", { p_payment_method: "demo_card_4242" });
  await expect(provider.deletePaymentMethod("demo_card_4242")).rejects.toThrow("Unconfirmed payment-method deletion");
});
