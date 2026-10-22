import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "postcss";

const css = readFileSync("src/components/layout/site-menu.module.css", "utf8");

function declarations(selector: string) {
  const values: Record<string, string> = {};
  parse(css).walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
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
});

test.each([".endingSoon", ".header [data-ending-soon-link]", ".pageCategories [data-ending-soon-link]"])("%s has no click-focus ring and keeps an underlined keyboard focus cue", selector => {
  expect(declarations(`${selector}:focus`).outline).toBe("none");
  expect(declarations(`${selector}:focus-visible`)).toMatchObject({
    outline: "none",
    "text-decoration": "underline",
    "text-decoration-thickness": "2px",
    "text-underline-offset": "3px",
  });
});

test("Browse and the search toggle keep their existing focus indicators", () => {
  expect(declarations(".browse:focus-visible").outline).toBe("2px solid #6feaff");
  expect(declarations(".searchToggle:focus-visible").outline).toBe("2px solid #6feaff");
});

test("the header shortcut stays orange and desktop still hides the page strip", () => {
  expect(declarations(".endingSoon").background).toBe("#ff630f");
  const desktop = parse(css).nodes.find(node => node.type === "atrule" && node.name === "media" && node.params === "(min-width: 768px)");
  expect(desktop?.toString()).toContain(".pageCategories:not([data-menu-preview]) { display: none; }");
});

test("all mobile header styles scale only the ticket artwork without changing its layout box", () => {
  expect(declarations(".accountControls > a [data-entry-ticket-icon]")).toEqual({
    transform: "scale(.9)",
    "transform-origin": "center",
  });
});

test("desktop keeps the original ticket size while mobile previews keep the reduction", () => {
  const desktop = parse(css).nodes.find(node => node.type === "atrule" && node.name === "media" && node.params === "(min-width: 768px)");
  expect(desktop?.toString()).toContain(".header:not([data-menu-preview]) .accountControls > a [data-entry-ticket-icon] { transform: none; }");
});
