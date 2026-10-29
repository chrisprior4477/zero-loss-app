import { expect, test } from "vitest";
import { parseFundingDollars } from "./funding-amount";

test.each([
  ["50", 5000], ["$50", 5000], ["1", 100], ["1,250", 125000],
  ["5000", 500000], ["21474836", 2147483600],
])("%s converts to exactly %i cents", (value, cents) => {
  expect(parseFundingDollars(value)).toBe(cents);
});

test.each(["", ".", "50.", "1.25", "50.50", "$50.50", "50.00", "1,250.50", "50.505", "50..50", "50,50", "-50", "1e3", "0.99", "21474837", "Infinity"])("invalid %s is rejected without silently changing its value", value => {
  expect(parseFundingDollars(value)).toBeNull();
});
