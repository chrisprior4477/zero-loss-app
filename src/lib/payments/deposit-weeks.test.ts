import { expect, test } from "vitest";
import type { DemoFundingRequest } from "./demo-provider";
import { getDepositWeeks, formatDepositTotal } from "./deposit-weeks";

function receipt(id: string, postedAt: string, amount: number): DemoFundingRequest {
  return { id, idempotencyKey: id, status: "succeeded", currency: "USD", amount, created_at: "2026-10-01T12:00:00Z", postedAt, reconciliation: "reconciled" };
}

test("weeks descend by local Monday across a clock change, using matched posting dates", () => {
  const sunday = receipt("sunday", "2026-11-02T04:59:59Z", 1250);
  const monday = receipt("monday", "2026-11-02T05:00:00Z", 800);
  const pending = { ...monday, id: "pending", reconciliation: "credit_pending" as const };
  const chart = getDepositWeeks([sunday, pending, monday], "2026-11-08T16:00:00Z", "America/New_York")!;
  expect(chart.weeks.map(w => w.cents)).toEqual([BigInt(800), BigInt(1250), BigInt(0), BigInt(0)]);
  expect(chart.latest?.id).toBe("monday");
  expect(chart.weeks[1].receipts).toEqual([sunday]);
});

test("a missing posting timestamp cannot become a zero or a guessed week", () => {
  expect(getDepositWeeks([{ ...receipt("legacy", "", 100), postedAt: null }], "2026-11-08T12:00:00Z")).toBeNull();
});

test("lifetime funding totals can exceed a single safe integer; historical cents remain exact", () => {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  expect(formatDepositTotal(max + max)).toBe("$180,143,985,094,819.82");
});
