import { expect, test } from "vitest";
import { fundingHref, fundingReturnPath } from "./funding-navigation";
import { productEntryHref, fundedProductEntryHref } from "@/lib/entries/return-intent";
import { productBrowseReturnHref } from "@/lib/catalog/product-return";
import { authNavigationHref, entryReturnPath, signInReturnPath } from "@/lib/auth/entry-return";

test.each([
  "/browse?category=electronics&sort=fewest-left",
  "/browse?category=electronics&sort=ending-soon",
  "/browse?q=coffee+%26+tea&type=gift-cards&retailer=Dunkin%27&available=1&minValue=25&maxValue=100",
])("shopping context survives funding, login and the product return: %s", browse => {
  const walletHref = fundingHref("playstation-5-slim", undefined, 111, browse);
  expect(fundingReturnPath(walletHref)).toBe(walletHref);
  expect(new URL(authNavigationHref("/login", walletHref), "https://example.test").searchParams.get("next")).toBe(walletHref);
  const walletQuery = new URL(walletHref, "https://example.test").searchParams;
  const back = productEntryHref(walletQuery.get("from")!, Number(walletQuery.get("quantity")), walletQuery.get("browse"));
  expect(entryReturnPath(back)).toBe(back);
  expect(signInReturnPath(back)).toBe(back);
  for (const path of [back, fundedProductEntryHref(back)]) {
    const url = new URL(path, "https://example.test");
    expect(url.pathname).toBe("/items/playstation-5-slim");
    expect(url.searchParams.get("quantity")).toBe("111");
    expect(productBrowseReturnHref(url.searchParams.get("from"))).toBe(browse);
    expect(url.hash).toBe("#enter-entry");
  }
});

test.each([
  "https://evil.test/browse", "//evil.test/browse", "/account/wallet", "/browse?next=https://evil.test",
  "/browse?category=electronics&category=gas", "/browse#wrong", "/browse\n", "/browse\\evil",
])("nested shopping addresses cannot become arbitrary redirects: %s", browse => {
  const suffix = encodeURIComponent(browse);
  expect(fundingHref("playstation-5-slim", undefined, 3, browse)).not.toContain("browse=");
  expect(signInReturnPath(`/account/wallet?view=history&from=playstation-5-slim&browse=${suffix}#add-funds`)).toBeNull();
  expect(entryReturnPath(`/items/playstation-5-slim?from=${suffix}#enter-entry`)).toBeNull();
});

test("browse context cannot replace an exact purchase option or appear without a product", () => {
  const browse = encodeURIComponent("/browse?category=electronics");
  expect(fundingHref(undefined, undefined, undefined, "/browse?category=electronics")).not.toContain("browse=");
  for (const path of [
    `/account/wallet?view=history&browse=${browse}#add-funds`,
    `/account/wallet?view=history&from=playstation-5-slim&entry=ent_11111111111111111111111111111111&browse=${browse}#add-funds`,
    `/account/wallet?view=history&from=playstation-5-slim&browse=${browse}&browse=${browse}#add-funds`,
    `/items/playstation-5-slim?from=${browse}&from=${browse}#enter-entry`,
  ]) expect(signInReturnPath(path)).toBeNull();
});

test("funding retains one exact purchase entry, never an arbitrary return URL", () => {
  const entry = "ent_11111111111111111111111111111111";
  const destination = `/account/wallet?view=history&from=babys-essentials-bundle&entry=${entry}#add-funds`;
  expect(fundingHref("babys-essentials-bundle", entry)).toBe(destination);
  expect(fundingReturnPath(destination)).toBe(destination);
  expect(fundingHref("babys-essentials-bundle", "https://evil.test")).not.toContain("entry=");
  expect(fundingReturnPath(`${destination.replace("#add-funds", "")}&entry=${entry}#add-funds`)).toBeNull();
  expect(fundingReturnPath(`/account/wallet?view=history&entry=${entry}#add-funds`)).toBeNull();
});

test("funding links target the form and retain the originating prize", () => {
  expect(fundingHref("samsung-m70h-tv")).toBe("/account/wallet?view=history&from=samsung-m70h-tv#add-funds");
  expect(fundingHref()).toBe("/account/wallet?view=history#add-funds");
  expect(fundingReturnPath(fundingHref("samsung-m70h-tv"))).toBe(fundingHref("samsung-m70h-tv"));
  expect(fundingHref("samsung-m70h-tv", undefined, 4)).toBe("/account/wallet?view=history&from=samsung-m70h-tv&quantity=4#add-funds");
  expect(fundingReturnPath(fundingHref("samsung-m70h-tv", undefined, 4))).toBe(fundingHref("samsung-m70h-tv", undefined, 4));
  expect(fundingHref("samsung-m70h-tv", undefined, 111)).toBe("/account/wallet?view=history&from=samsung-m70h-tv&quantity=111#add-funds");
  expect(fundingHref("samsung-m70h-tv", "ent_11111111111111111111111111111111", 4)).not.toContain("quantity=");
});

test("invalid prize identifiers cannot turn into URL parameters or redirects", () => {
  for (const value of ["//evil.test", "../account", "thing&next=https://evil.test", "", "thing#other"]) {
    expect(fundingHref(value)).toBe("/account/wallet?view=history#add-funds");
  }
});

test.each([
  "https://evil.test/account/wallet?view=history#add-funds",
  "//evil.test/account/wallet?view=history#add-funds",
  "/account/wallet?view=history&from=../account#add-funds",
  "/account/wallet?view=history&from=%2F%2Fevil.test#add-funds",
  "/account/wallet?view=history&from=thing&next=https://evil.test#add-funds",
  "/account/wallet?view=history&from=thing&from=other#add-funds",
  "/account/wallet?view=card#add-funds",
  "/account/wallet?view=history#transactions",
  "/account/wallet?view=history#add-funds\n",
  "/account/wallet?view=history&from=thing&quantity=2147483648#add-funds",
  "/account/wallet?view=history&from=thing&quantity=2&quantity=3#add-funds",
  null,
  ["/account/wallet?view=history#add-funds"],
])("rejects destinations outside the exact funding path: %s", (value) => {
  expect(fundingReturnPath(value)).toBeNull();
});
