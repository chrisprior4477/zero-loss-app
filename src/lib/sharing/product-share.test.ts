import { expect, test } from "vitest";
import { crewLookupKind, emailHref, isAppleMobile, isProductShareItem, messageHref, productShareUrl, shareDismissalKey } from "./product-share";

test("public exact listing excludes private account path, query and fragments", () => {
  expect(productShareUrl("https://example.test/account/entries?entry=private#receipt", "nike-court-shot")).toBe("https://example.test/items/nike-court-shot");
  expect(() => productShareUrl("https://example.test", "../account")).toThrow();
  expect(() => productShareUrl("javascript:alert(1)", "nike-court-shot")).toThrow();
});
test("SMS handoff encodes one body and supports choosing recipient in phone app", () => {
  expect(messageHref("+1 (202) 555-0123", "Shoes & baby\nhttps://example.test/items/shoes", true)).toBe("sms:+12025550123&body=Shoes%20%26%20baby%0Ahttps%3A%2F%2Fexample.test%2Fitems%2Fshoes");
  expect(messageHref("", "Look", false)).toBe("sms:?body=Look");
  expect(() => messageHref("+123?body=evil", "Look", false)).toThrow();
  expect(isAppleMobile("iPhone", "", 1)).toBe(true); expect(isAppleMobile("", "MacIntel", 5)).toBe(true);
  expect(isAppleMobile("Android", "Linux", 5)).toBe(false);
});
test("email supports optional recipient but rejects header or extra-recipient injection", () => {
  expect(emailHref("", "Nike shoes", "Look & share")).toBe("mailto:?subject=Nike%20shoes&body=Look%20%26%20share");
  for (const email of ["friend@example.test?bcc=other@example.test", "friend@example.test\nBcc:x@y.test", "a@b.test,c@d.test"]) expect(() => emailHref(email, "Shoes", "Look")).toThrow();
});
test("discovery routes privately and transient dismissal is account-and-item scoped", () => {
  expect(crewLookupKind("Jane Smith")).toBe("name"); expect(crewLookupKind("+1 202 555 0123")).toBe("phone"); expect(crewLookupKind("mom@example.test")).toBe("email");
  expect(shareDismissalKey("a", "shoe")).not.toBe(shareDismissalKey("b", "shoe"));
  expect(isProductShareItem({ slug: "shoe", title: "Shoe" })).toBe(true); expect(isProductShareItem({ slug: "../account", title: "Private" })).toBe(false);
});
