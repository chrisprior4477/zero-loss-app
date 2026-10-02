import { expect, test } from "vitest";
import { entryReturnPath, productReturnFromReferer, signInReturnPath } from "./entry-return";

test("keeps a product entry destination after sign-in", () => {
  expect(entryReturnPath("/items/playstation-5-slim#enter-entry")).toBe(
    "/items/playstation-5-slim#enter-entry",
  );
  expect(entryReturnPath("/items/playstation-5-slim?quantity=4#enter-entry")).toBe("/items/playstation-5-slim?quantity=4#enter-entry");
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
  for (const value of ["/items/thing?quantity=0#enter-entry", "/items/thing?quantity=11#enter-entry", "/items/thing?quantity=2&next=https://evil.test#enter-entry", "/items/thing?quantity=2&quantity=3#enter-entry"]) {
    expect(entryReturnPath(value)).toBeNull();
  }
});

test("sign-out referrer fallback can only return to a same-host product", () => {
  expect(productReturnFromReferer("https://preview.example/items/dyson-v8-cordless-vacuum?quantity=5", "preview.example"))
    .toBe("/items/dyson-v8-cordless-vacuum?quantity=5#enter-entry");
  expect(productReturnFromReferer("https://evil.example/items/dyson-v8-cordless-vacuum", "preview.example")).toBeNull();
  expect(productReturnFromReferer("https://preview.example/account/security", "preview.example")).toBeNull();
});
