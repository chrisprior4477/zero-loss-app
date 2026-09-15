import { expect, test } from "vitest";
import { customerDisplayName } from "./profile-name";
test.each(["Chris Prior", "McDonald", "de la Cruz", "O’Neill", "chris prior"])("preserves saved display name %s ahead of legal name", name => {
  expect(customerDisplayName({ display_name: name, legal_first_name: "chris", legal_last_name: "prior" })).toBe(name);
});
test("missing display name uses stored legal casing, never invents capitalization", () => {
  expect(customerDisplayName({ display_name: null, legal_first_name: "chris", legal_last_name: "prior" })).toBe("chris prior");
  expect(customerDisplayName(null)).toBe("Zero Loss member");
});
