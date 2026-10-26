import { expect, test } from "vitest";
import { parseFundingDollars } from "./funding-amount";

test.each([["25.50", 2550], ["$25.50", 2550], ["1.01", 101], ["25.", 2500], ["1,250.50", 125050], ["501", 50100], ["21474836.47", 2147483647]])("preserves the exact amount %s", (value, cents) => {
  expect(parseFundingDollars(String(value))).toBe(cents);
});
test.each(["25.505", "25,50", "1,00", "-25", "1e3", "abc25", "0.99", "", "21474836.48", "900719925474099100"]) ("rejects invalid or unrepresentable amounts instead of changing them: %s", value => {
  expect(parseFundingDollars(value)).toBeNull();
});
