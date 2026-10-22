import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "postcss";

const css = readFileSync("src/components/layout/site-menu.module.css", "utf8");

function declarations(selector: string) {
  const values: Record<string, string> = {};
  parse(css).walkRules(selector, rule => {
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

test("the non-Classic mobile page strip blends into the site, including menu previews", () => {
  expect(declarations(".pageCategories").background).toBe("var(--background)");
  expect(declarations(".pageCategories [data-ending-soon-link]")).toMatchObject({
    background: "transparent",
    color: "#fff",
    "font-weight": "800",
    "box-shadow": "none",
  });
  expect(declarations(".pageCategories [data-ending-soon-link]:hover").background).toBe("#ffffff14");
  expect(declarations(".pageCategories [data-ending-soon-link]:focus-visible").outline).toBe("2px solid #6feaff");
});

test("the header shortcut stays orange and desktop still hides the page strip", () => {
  expect(declarations(".endingSoon").background).toBe("#ff630f");
  const desktop = parse(css).nodes.find(node => node.type === "atrule" && node.name === "media" && node.params === "(min-width: 768px)");
  expect(desktop?.toString()).toContain(".pageCategories:not([data-menu-preview]) { display: none; }");
});
