import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const css = readFileSync("src/components/account/my-activity.module.css", "utf8");

test("activity amounts and actions share a bottom-aligned in-flow footer", () => {
  const footer = css.match(/\.cardFoot\s*\{([^}]+)\}/)?.[1];
  expect(footer).toContain("display: flex");
  expect(footer).toContain("align-items: flex-end");
  for (const selector of ["noteStack", "cardAction"]) {
    const rules = [...css.matchAll(new RegExp(`\\.${selector}\\s*\\{([^}]+)\\}`, "g"))];
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule[1]).not.toMatch(/position:\s*absolute|\btop:\s*-/);
    }
  }
});

test("footer labels can wrap without shrinking through their words", () => {
  const labelRule = css.match(/\.cardAction > span:first-child, \.cardAction > span:last-of-type\s*\{([^}]+)\}/)?.[1];
  expect(labelRule).toContain("min-width: min-content");
  expect(labelRule).toContain("white-space: normal");
});
