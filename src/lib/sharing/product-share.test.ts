import { expect, test } from "vitest";
import { crewLookupKind, emailHref, isAppleMobile, isProductShareItem, messageHref, nativeProductShareData, productShareUrl, shareDismissalKey, webmailHref } from "./product-share";

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

test("Windows receives the URL inside text too, without changing mobile payloads", () => {
  const item = { title: "Lowe’s gift card", slug: "lowes-gift-card" };
  const windows = nativeProductShareData(item, "https://example.test", "Windows NT 10.0");
  expect(windows.text).toContain(windows.url);
  for (const ua of ["Android", "iPhone", "iPad"]) {
    const data = nativeProductShareData(item, "https://example.test", ua);
    expect(data.text).not.toContain("https://"); expect(data.url).toBe(windows.url);
  }
});

test.each(["gmail", "outlook", "outlook-work"] as const)("%s browser draft includes exactly encoded recipient, subject and public URL", provider => {
  const body = "Shoes & gift cards\nhttps://example.test/items/test-prize";
  const url = new URL(webmailHref(provider, "friend+test@example.test", "Lowe’s & Nike", body));
  expect(url.protocol).toBe("https:");
  expect(url.searchParams.get("to")).toBe("friend+test@example.test");
  expect(url.searchParams.get("subject") ?? url.searchParams.get("su")).toBe("Lowe’s & Nike");
  expect(url.searchParams.get("body")).toBe(body);
  expect(new URL(webmailHref(provider, "", "A", body)).searchParams.get("to")).toBe("");
  expect(() => webmailHref(provider, "friend@example.test?bcc=evil@example.test", "A", body)).toThrow();
});

test.each(["gmail", "outlook", "outlook-work"] as const)("%s encodes spaces as percent-20 without changing literal plus signs", provider => {
  const subject = "$150 Lowe’s + Home & Garden = 100%";
  const body = "Thought you might like this + that.\nhttps://example.test/items/lowes-gift-card";
  const href = webmailHref(provider, "friend+gift@example.test", subject, body);
  expect(href).not.toContain("+");
  expect(href).toContain("%20");
  expect(href).toContain("%2B");
  // Unlike URLSearchParams.get(), Outlook's compose decoding can leave + as-is.
  const fields = Object.fromEntries(new URL(href).search.slice(1).split("&").map(field => {
    const [key, value] = field.split("=");
    return [key, decodeURIComponent(value)];
  }));
  expect(fields.to).toBe("friend+gift@example.test");
  expect(fields.subject ?? fields.su).toBe(subject);
  expect(fields.body).toBe(body);
});
