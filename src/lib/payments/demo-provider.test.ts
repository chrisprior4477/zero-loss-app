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
