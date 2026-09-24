import { expect, test } from "vitest";
import { crewActivityPath } from "./CrewActivityOutline";

const stage = { left: 0, right: 1000, top: 0, bottom: 800 };
const rail = { left: 24, right: 976, top: 100, bottom: 350 };
const panel = { left: 0, right: 1000, top: 356, bottom: 800 };

test.each([27, 181, 335, 489, 643])("the selected Crew card at x=%i joins the panel with one closed, rounded outline", (left) => {
  const path = crewActivityPath(stage, rail, { left, right: left + 142, top: 112, bottom: 350 }, panel);
  const tabLeft = left + 1;
  const tabRight = left + 141;
  expect(path.match(/M /g)).toHaveLength(1);
  expect(path.endsWith(" Z")).toBe(true);
  expect(path).toContain(`Q ${tabRight} 357 ${tabRight} 345`);
  expect(path).toContain(`Q ${tabLeft} 113 ${tabLeft} 131`);
  expect(path).not.toContain("NaN");
  // A second rectangular outline would draw a seam through the active card.
  expect(path).not.toContain("Q 999 357 981 357 H 19");
});

test("mobile card follows the clipped rail and stays inside the activity panel", () => {
  const path = crewActivityPath({ ...stage, right: 358 }, { ...rail, left: 17, right: 341 }, { left: 145, right: 257, top: 112, bottom: 350 }, { ...panel, right: 358 });
  expect(path).toContain("Q 256 357 256 345");
  expect(path).toContain("Q 146 357 134 357");
  expect(path).toContain("Q 357 357 339 357");
});

test("a scrolled-off portrait leaves a complete rounded panel instead of a missing border", () => {
  const path = crewActivityPath(stage, rail, { left: -200, right: -58, top: 112, bottom: 350 }, panel);
  expect(path).toContain("H 19 Q 1 357 1 375");
  expect(path).not.toContain("113");
  expect(path.endsWith(" Z")).toBe(true);
});

test("zero-size pre-layout measurements do not produce invalid geometry", () => {
  const zero = { left: 0, right: 0, top: 0, bottom: 0 };
  expect(crewActivityPath(zero, zero, zero, zero)).toBe("");
});

test("the first mobile card rounds both sides of the narrow left join", () => {
  const path = crewActivityPath(stage, { ...rail, left: 16 }, { left: 19, right: 131, top: 112, bottom: 350 }, panel);
  expect(path).toContain("Q 20 357 10.5 357 H 10.5 Q 1 357 1 366.5");
});
