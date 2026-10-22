import { afterEach, expect, test } from "vitest";
import { isEntryQuantity, parseEntryQuantity } from "./quantity";
import { productEntryHref, fundedProductEntryHref, saveEntryIntent, readEntryIntent } from "./return-intent";
import { fundingHref, fundingReturnPath } from "@/lib/wallet/funding-navigation";
import { entryReturnPath, signInReturnPath } from "@/lib/auth/entry-return";
import { accountReturnPath } from "@/lib/auth/account-return";
import { parseEntryRequest } from "./request";

afterEach(() => sessionStorage.clear());

test.each([11, 125, 1000, 2_147_483_647])("%s tickets survive the entire navigation/recovery chain", quantity => {
  expect(isEntryQuantity(quantity)).toBe(true);
  expect(parseEntryQuantity(String(quantity))).toBe(quantity);
  const href = `/items/test-prize?quantity=${quantity}#enter-entry`;
  expect(productEntryHref("test-prize", quantity)).toBe(href);
  expect(entryReturnPath(href)).toBe(href);
  expect(signInReturnPath(href)).toBe(href);
  expect(fundedProductEntryHref(href)).toBe(`/items/test-prize?quantity=${quantity}&funded=1#enter-entry`);
  const funding = fundingHref("test-prize", undefined, quantity);
  expect(funding).toContain(`quantity=${quantity}`);
  expect(fundingReturnPath(funding)).toBe(funding);
  expect(accountReturnPath(funding)).toBe(funding);
  saveEntryIntent("test-prize", "Test prize", quantity);
  expect(readEntryIntent()?.quantity).toBe(quantity);
});

test.each(["0", "-1", "1.5", "01", "1e3", "Infinity", "2147483648", "9007199254740993"]) (
  "rejects invalid or unrepresentable quantity %s throughout navigation", value => {
    expect(parseEntryQuantity(value)).toBeNull();
    expect(entryReturnPath(`/items/test-prize?quantity=${value}#enter-entry`)).toBeNull();
    expect(fundingReturnPath(`/account/wallet?view=history&from=test-prize&quantity=${value}#add-funds`)).toBeNull();
  },
);

test("a large saved request receipt remains readable", () => {
  expect(parseEntryRequest({ requestId: "11111111-2222-4333-8444-555555555555", slug: "test-prize",
    title: "Test prize", quantity: 125, amountCents: 12500, status: "pending", duplicate: false,
    undoUntil: "2026-10-22T21:30:00Z", serverNow: "2026-10-22T21:29:30Z" }).quantity).toBe(125);
});
