import { expect, test } from "vitest";
import { isAtLeastAge } from "./validation";

test("validates the calendar date before calculating age", () => {
  expect(isAtLeastAge("1905-11-04")).toBe(true);
  expect(isAtLeastAge("2000-02-29")).toBe(true);
  for (const invalid of ["1900-02-29", "1990-02-30", "1990-04-31", "1990-00-10", "1990-11-00", "0000-01-01"]) {
    expect(isAtLeastAge(invalid)).toBe(false);
  }
});
