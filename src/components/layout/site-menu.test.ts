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

test("Browse keeps its existing focus indicator", () => {
  expect(declarations(".browse:focus-visible").outline).toBe("2px solid #6feaff");
});

test("mobile Search and account controls split the free space evenly", () => {
  expect(declarations(".searchToggle")["margin-left"]).toBe("auto");
  expect(declarations(".accountControls")["margin-left"]).toBe("auto");
});

test("full-header search centering applies only at desktop widths and excludes mobile previews", () => {
  const matches: string[] = [];
  parse(css).walkRules(rule => {
    if (!rule.selectors.includes(".header:not([data-menu-preview]) .desktopSearch")) return;
    rule.walkDecls("position", declaration => {
      if (declaration.value !== "absolute") return;
      expect(rule.parent?.type).toBe("atrule");
      if (rule.parent?.type === "atrule") matches.push(rule.parent.params);
    });
  });
  expect(matches).toEqual(["(min-width: 1024px)"]);
  expect(declarations(".header:not([data-menu-preview]) .desktopSearch")).toMatchObject({
    "inset-inline": "0", "margin-inline": "auto",
    width: "min(700px, calc(100% - (var(--desktop-header-side-width, 320px) + 40px) * 2))",
  });
});

test("Search pulses only its magnifying glass and never draws a pulse ring", () => {
  const selector = '.header:is([data-menu-layout="search-down"], [data-menu-layout="search-down-browse"], [data-menu-layout="search-over"])[data-search-open="false"] .searchToggle';
  expect(declarations(selector).animation).toBeUndefined();
  expect(declarations(`${selector} svg`).animation).toBe("search-invitation 2.6s ease-in-out infinite");
  const animation = parse(css).nodes.find(node => node.type === "atrule" && node.name === "keyframes" && node.params === "search-invitation");
  expect(animation?.toString()).toContain("scale(1.1)");
  expect(animation?.toString()).not.toContain("box-shadow");
});

test("Search has no tap or hover box but keeps a keyboard-only underline", () => {
  expect(declarations(".searchToggle")).toMatchObject({ outline: "none", "-webkit-tap-highlight-color": "transparent" });
  expect(declarations(".searchToggle:focus").outline).toBe("none");
  expect(declarations(".searchToggle:hover").outline).toBeUndefined();
  expect(declarations(".searchToggle:focus-visible::after")).toMatchObject({ height: "2px", background: "currentColor" });
});

test("the header shortcut stays orange and wide screens retain Classic until viewport preferences are ready", () => {
  expect(declarations(".endingSoon").background).toBe("#ff630f");
  const desktop = parse(css).nodes.find(node => node.type === "atrule" && node.name === "media" && node.params === "(min-width: 768px)");
  expect(desktop?.toString()).toContain(".pageCategories:not([data-menu-preview]):not([data-menu-viewport]) { display: none; }");
  expect(desktop?.toString()).toContain('.header:not([data-menu-preview]):is([data-menu-layout="classic"], :not([data-menu-viewport])) .desktopSearch { display: flex; }');
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

test("all mobile headers select the narrower outline without affecting drawer tickets", () => {
  expect(declarations('.accountControls > a [data-entry-ticket-outline="standard"]')).toEqual({ display: "none" });
  expect(declarations('.accountControls > a [data-entry-ticket-outline="narrow"]')).toEqual({ display: "inline" });
});

test("mobile tickets use the approved 40 percent closer gap and desktop retains its spacing", () => {
  expect(declarations('.accountControls > a [data-entry-ticket-group]')).toEqual({ gap: "calc(6px - 10.392px * .4)" });
  const desktop = parse(css).nodes.find(node => node.type === "atrule" && node.name === "media" && node.params === "(min-width: 768px)");
  expect(desktop?.toString()).toContain('.header:not([data-menu-preview]) .accountControls > a [data-entry-ticket-group] { gap: 6px; }');
});

test("desktop restores the standard outline while mobile previews remain narrow", () => {
  const desktop = parse(css).nodes.find(node => node.type === "atrule" && node.name === "media" && node.params === "(min-width: 768px)");
  expect(desktop?.toString()).toContain('.header:not([data-menu-preview]) .accountControls > a [data-entry-ticket-outline="standard"] { display: inline; }');
  expect(desktop?.toString()).toContain('.header:not([data-menu-preview]) .accountControls > a [data-entry-ticket-outline="narrow"] { display: none; }');
});
