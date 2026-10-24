import { readFileSync } from "node:fs";
import { parse } from "postcss";
import { expect, test } from "vitest";

const css = parse(readFileSync("src/components/help/help-tickets.module.css", "utf8"));

function declarations(selector: string) {
  const values: Record<string, string> = {};
  css.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

test("field wrapper and browser autofill share one fill and readable text in both focus states", () => {
  expect(declarations(".field")).toMatchObject({
    "--field-fill": "#e3f4fc", "--field-ink": "#0a1741", background: "var(--field-fill)",
  });
  expect(declarations(".field:focus-within")).toMatchObject({
    "--field-fill": "#123d65", "--field-ink": "#fff",
  });
  // Not focus-only: browser-saved text also needs matching paint on blur/hover.
  expect(declarations(".field :is(input, select, textarea):is(:autofill, :-webkit-autofill)")).toMatchObject({
    "box-shadow": "inset 0 0 0 1000px var(--field-fill)",
    "-webkit-text-fill-color": "var(--field-ink)",
  });
});

test.each(["input", "select", "textarea"])("%s keeps a visible caret and fill-based focus without a perimeter outline", control => {
  expect(declarations(`.field ${control}`)).toMatchObject({
    background: "transparent", color: "var(--field-ink)", "caret-color": "var(--field-ink)",
    border: "0", "border-radius": "0", outline: "none",
  });
});

test("dropdown options remain readable and other ticket controls retain keyboard focus", () => {
  expect(declarations(".field select option")).toMatchObject({ background: "#fff", color: "#0a1741" });
  expect(declarations(".field:focus-within select option")).toMatchObject({ background: "#123d65", color: "#fff" });
  expect(declarations(".ticket:focus-visible").outline).toBe("3px solid #0079c8");
});
