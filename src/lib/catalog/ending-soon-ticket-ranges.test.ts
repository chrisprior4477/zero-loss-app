import { expect, test } from "vitest";
import { filterEndingSoonTickets, parseEndingSoonTicketRange } from "./ending-soon-ticket-ranges";

const products = [0, 1, 2, 5, 6, 10, 11].map(remaining => ({ capacity: 300, sold: 300 - remaining, remaining }));

test.each([
  ["1", [1]], ["2-5", [2, 5]], ["6-10", [6, 10]],
] as const)("%s matches both inclusive boundaries and excludes closed pools", (range, expected) => {
  expect(filterEndingSoonTickets(products, range).map(product => product.remaining)).toEqual(expected);
});

test("All does not impose a ten-ticket limit on already eligible prizes", () => {
  expect(filterEndingSoonTickets(products.slice(1), null).map(product => product.remaining)).toEqual([1, 2, 5, 6, 10, 11]);
});

test("only supported ranges are accepted", () => {
  expect(parseEndingSoonTicketRange(["2-5", "6-10"])).toBe("2-5");
  for (const value of [undefined, null, "", "all", "0", "11", "2", "1-100", 1]) {
    expect(parseEndingSoonTicketRange(value)).toBeNull();
  }
});
