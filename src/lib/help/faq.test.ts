import { expect, test } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { faqCategories, faqItems, filterFaqs } from "./faq";

test("every answer has a unique id, a topic and an existing local destination", () => {
  expect(new Set(faqItems.map(item => item.id)).size).toBe(faqItems.length);
  for (const item of faqItems) {
    expect(faqCategories.some(([id]) => id === item.category)).toBe(true);
    const url = new URL(item.action.href, "https://app.test");
    expect(url.origin).toBe("https://app.test");
    expect(existsSync(join(process.cwd(), "src/app", url.pathname, "page.tsx")) ||
      (url.pathname === "/account/security" && existsSync(join(process.cwd(), "src/app/account/[section]/page.tsx")))).toBe(true);
    expect(item.answer.length).toBeGreaterThan(50);
  }
});
test("search is case insensitive, includes aliases and matches multiple words", () => {
  expect(filterFaqs("  UNDO  ", "all").some(item => item.id === "undo-entry")).toBe(true);
  expect(filterFaqs("KYC", "all").map(item => item.id)).toEqual(["demo-identity"]);
  expect(filterFaqs("gift card", "rewards").every(item => item.category === "rewards")).toBe(true);
  expect(filterFaqs("not-a-known-answer", "all")).toEqual([]);
});
test("answers distinguish demo capabilities and do not promise a gift transfer or support email", () => {
  expect(faqItems.find(item => item.id === "gift-transfers")?.answer).toContain("not enabled");
  expect(faqItems.find(item => item.id === "support-case")?.answer).toContain("does not send support emails");
  expect(faqItems.find(item => item.id === "undo-entry")?.answer).toContain("30-second");
  expect(faqItems.find(item => item.id === "demo-identity")?.answer).toContain("Do not upload your real ID");
});
test("question matches rank before incidental mentions and common apostrophes work", () => {
  expect(filterFaqs("password", "all")[0].id).toBe("password");
  expect(filterFaqs("can’t sign in", "all")[0].id).toBe("password");
});
