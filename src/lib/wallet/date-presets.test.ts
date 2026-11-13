import { expect, test } from "vitest";
import { transactionDateRange } from "./date-presets";

test("uses the account day rather than UTC and includes today in seven days", () => {
  expect(transactionDateRange(7, "America/New_York", new Date("2026-11-08T02:00:00Z"))).toEqual({ from: "2026-11-01", through: "2026-11-07" });
  expect(transactionDateRange(1, "Asia/Tokyo", new Date("2026-11-08T02:00:00Z"))).toEqual({ from: "2026-11-08", through: "2026-11-08" });
});
test("crosses month and daylight saving boundaries by calendar date", () => {
  expect(transactionDateRange(30, "America/New_York", new Date("2026-11-03T17:00:00Z"))).toEqual({ from: "2026-10-05", through: "2026-11-03" });
});
