import { describe, expect, test } from "vitest";
import { assertFundingAmount, assertIdempotencyKey } from "@/lib/payments/provider";

describe("payment provider boundary", () => {
  test("accepts integer-cent demo funding within the configured limits", () => {
    expect(() => assertFundingAmount(2_500)).not.toThrow();
  });

  test.each([0, 99, 50_001, 10.5, Number.NaN])(
    "rejects unsafe funding amount %s",
    (amount) => expect(() => assertFundingAmount(amount)).toThrow(),
  );

  test("requires a durable client idempotency key", () => {
    expect(() => assertIdempotencyKey("funding_01J9ZY5JD4K2H8W6")).not.toThrow();
    expect(() => assertIdempotencyKey("double click")).toThrow();
  });
});
