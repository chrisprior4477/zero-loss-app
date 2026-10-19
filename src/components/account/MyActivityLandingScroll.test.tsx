import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MyActivityLandingScroll } from "./MyActivityLandingScroll";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup(matches = true) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches })));
  vi.stubGlobal("scrollTo", vi.fn());
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callback(0); return 1; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 700 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });

  const header = document.createElement("header");
  header.getBoundingClientRect = vi.fn(() => new DOMRect(0, 0, 360, 160));
  document.body.append(header);
  const heading = document.createElement("h1");
  heading.id = "my-activity-heading";
  heading.getBoundingClientRect = vi.fn(() => new DOMRect(0, 240, 360, 40));
  document.body.append(heading);
  const controls = document.createElement("div");
  controls.id = "my-activity-empty-controls";
  controls.getBoundingClientRect = vi.fn(() => new DOMRect(0, 710, 360, 50));
  document.body.append(controls);
  return { header, heading, controls, scrollTo: window.scrollTo as ReturnType<typeof vi.fn> };
}

test("mobile empty activity lands below the sticky header with actions in view", () => {
  const { header, heading, controls, scrollTo } = setup();
  const view = render(<MyActivityLandingScroll filter="completion" revealControls enabled />);
  expect(scrollTo).toHaveBeenCalledWith({ top: 76, behavior: "auto" });

  view.rerender(<MyActivityLandingScroll filter="completed" revealControls enabled />);
  expect(scrollTo).toHaveBeenCalledTimes(2);
  header.remove();
  heading.remove();
  controls.remove();
});

test("populated activity aligns the heading; desktop and detail views keep their scroll", () => {
  const { header, heading, controls, scrollTo } = setup();
  const view = render(<MyActivityLandingScroll filter="all" revealControls={false} enabled />);
  expect(scrollTo).toHaveBeenCalledWith({ top: 68, behavior: "auto" });

  scrollTo.mockClear();
  view.rerender(<MyActivityLandingScroll filter="active" revealControls={false} enabled={false} />);
  expect(scrollTo).not.toHaveBeenCalled();

  view.unmount();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  render(<MyActivityLandingScroll filter="prize" revealControls enabled />);
  expect(scrollTo).not.toHaveBeenCalled();
  header.remove();
  heading.remove();
  controls.remove();
});
