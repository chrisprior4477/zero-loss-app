import { expect, test } from "vitest";
import { entryReturnPath, signInReturnPath } from "./entry-return";

test("keeps a product entry destination after sign-in", () => {
  expect(entryReturnPath("/items/playstation-5-slim#enter-entry")).toBe(
    "/items/playstation-5-slim#enter-entry",
  );
});

test("sign-in can resume funding without broadening entry-only navigation", () => {
  const path = "/account/wallet?view=history&from=samsung-m70h-tv#add-funds";
  expect(signInReturnPath(path)).toBe(path);
  expect(entryReturnPath(path)).toBeNull();
  expect(signInReturnPath("/items/playstation-5-slim#enter-entry")).toBe("/items/playstation-5-slim#enter-entry");
  expect(signInReturnPath("/account/security")).toBe("/account/security");
  expect(signInReturnPath("https://evil.test")).toBeNull();
});

test("rejects external or unrelated sign-in destinations", () => {
  expect(entryReturnPath("https://example.com")).toBeNull();
  expect(entryReturnPath("//example.com/items/thing#enter-entry")).toBeNull();
  expect(entryReturnPath("/account/wallet")).toBeNull();
  expect(entryReturnPath("/items/../account#enter-entry")).toBeNull();
});
