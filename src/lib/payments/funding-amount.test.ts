import { expect, test } from "vitest";
import { parseFundingDollars } from "./funding-amount";

test.each([
  ["50", 5000], ["50.", 5000], ["50.5", 5050], ["50.50", 5050],
  ["$50.50", 5050], ["1.01", 101], ["1,250.50", 125050],
  ["5000", 500000], ["21474836.47", 2147483647],
])("%s converts to exactly %i cents", (value, cents) => {
  expect(parseFundingDollars(value)).toBe(cents);
});

test.each(["", ".", "50.505", "50..50", "50,50", "-50", "1e3", "0.99", "21474836.48", "Infinity"])("invalid %s is rejected without silently changing its value", value => {
  expect(parseFundingDollars(value)).toBeNull();
});
