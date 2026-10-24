import { readFileSync } from "node:fs";
import { parse } from "postcss";
import { expect, test } from "vitest";

const css = parse(readFileSync("src/components/account/notifications.module.css", "utf8"));
function declarations(selector: string) {
  const values: Record<string, string> = {};
  css.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

test("action-needed banner uses the sky-blue palette, including hover", () => {
  expect(declarations(".actionShortcut")).toMatchObject({ background: "#bbebff", border: "2px solid #70c7f5" });
  expect(declarations(".actionShortcut:hover").background).toBe("#a4ddff");
});

test("email confirmation uses blue hues with no amber perimeter or brown action override", () => {
  expect(declarations('.notification[data-emphasis="email"]')).toEqual({ background: "#e3f4fc" });
  expect(declarations('.notification[data-emphasis="email"] .visual')).toMatchObject({ color: "#0653bc", background: "#bbebff" });
  expect(declarations('.notification[data-emphasis="email"] .details strong')).toMatchObject({ color: "#1452a6", background: "#bbebff" });
  expect(declarations('.notification[data-emphasis="email"] .rowAction')).toEqual({});
  expect(declarations(".rowAction").background).toBe("#006dff");
  expect(declarations(".rowAction:hover").background).toBe("#0052d5");
});

test("ticket masks, notification actions and settings anchor offsets are preserved", () => {
  expect(declarations(".notification")["mask-image"].match(/radial-gradient/g)).toHaveLength(6);
  expect(declarations(".settingsBlock")["scroll-margin-top"]).toBe("calc(var(--notifications-header-height, 140px) + 12px)");
});
