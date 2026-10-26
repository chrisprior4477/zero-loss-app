import { expect, test } from "vitest";
import { fundingHref, fundingReturnPath } from "./funding-navigation";
import { productEntryHref, fundedProductEntryHref, safeProductEntryReturn } from "@/lib/entries/return-intent";
import { browseReturnPath } from "@/lib/catalog/product-return";
import { accountReturnPath } from "@/lib/auth/account-return";

test("category and search survive funding, authentication, and entry return", () => {
  const browse = "/browse?category=electronics&sort=ending-soon&q=PlayStation";
  const funding = fundingHref("playstation-5-slim", undefined, 46, false, browse);
  expect(fundingReturnPath(funding)).toBe(funding);
  expect(accountReturnPath(funding)).toBe(funding);
  const back = productEntryHref("playstation-5-slim", 46, browse);
  expect(safeProductEntryReturn(back)).toBe(back);
  const returned = new URL(fundedProductEntryHref(back), "https://test.invalid");
  expect(returned.searchParams.get("quantity")).toBe("46");
  expect(returned.searchParams.get("from")).toBe(browse);
  expect(returned.searchParams.get("funded")).toBe("1");
});

test.each(["https://evil.test/browse", "//evil.test/browse", "/browse?next=https://evil.test", "/browse#unexpected", "/browse/../support", "/browse\\evil"])("untrusted shopping destination is rejected: %s", value => {
  expect(browseReturnPath(value)).toBeNull();
  expect(new URL(fundingHref("playstation-5-slim", undefined, 46, false, value), "https://test.invalid").searchParams.has("shop")).toBe(false);
});
