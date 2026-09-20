import { expect, test } from "vitest";
import { entryReturnPath } from "./entry-return";

test("keeps a product entry destination after sign-in", () => {
  expect(entryReturnPath("/items/playstation-5-slim#enter-entry")).toBe(
    "/items/playstation-5-slim#enter-entry",
  );
});

test("rejects external or unrelated sign-in destinations", () => {
  expect(entryReturnPath("https://example.com")).toBeNull();
  expect(entryReturnPath("//example.com/items/thing#enter-entry")).toBeNull();
  expect(entryReturnPath("/account/wallet")).toBeNull();
  expect(entryReturnPath("/items/../account#enter-entry")).toBeNull();
});
