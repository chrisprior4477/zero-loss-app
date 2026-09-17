import { expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DemoPaymentProvider } from "./demo-provider";
test("invalid provider response cannot reach the event consumer", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { status: "succeeded" } });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).finishFunding("request")).rejects.toThrow();
  expect(rpc).toHaveBeenCalledTimes(1);
});
test.each([null, {}, [{ id: "a", amount: 0, currency: "USD", created_at: "2026-09-14", reconciliation: "reconciled" }]])("malformed request data never becomes an empty list", async data => {
  const rpc = vi.fn().mockResolvedValue({ data });
  await expect(new DemoPaymentProvider({ rpc } as unknown as SupabaseClient).getRequests()).rejects.toThrow();
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
