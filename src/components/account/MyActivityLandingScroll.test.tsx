import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MyActivityLandingScroll } from "./MyActivityLandingScroll";
import { activityFilters } from "@/lib/account/activity";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.querySelectorAll("[data-scroll-fixture]").forEach(element => element.remove());
});

test.each([true, false])("Open Entries lands at the filters on mobile=%s, without stealing detail-view scroll", matches => {
  const { scrollTo } = setup(matches);
  const view = render(<MyActivityLandingScroll filter="active" revealControls={false} enabled />);
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 248, behavior: "auto" });
  scrollTo.mockClear();
  view.rerender(<MyActivityLandingScroll filter="active" revealControls={false} enabled={false} />);
  expect(scrollTo).not.toHaveBeenCalled();
  view.rerender(<MyActivityLandingScroll filter="active" revealControls={false} enabled />);
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 248, behavior: "auto" });
});

function setup(matches = true) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches })));
  vi.stubGlobal("scrollTo", vi.fn());
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callback(0); return 1; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 700 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });

  const header = document.createElement("header");
  header.dataset.scrollFixture = "";
  header.getBoundingClientRect = vi.fn(() => new DOMRect(0, 0, 360, 160));
  document.body.append(header);
  const filters = document.createElement("nav");
  filters.dataset.scrollFixture = "";
  filters.id = "my-activity-filters";
  filters.getBoundingClientRect = vi.fn(() => new DOMRect(0, 420, 360, 200));
  document.body.append(filters);
  const controls = document.createElement("div");
  controls.dataset.scrollFixture = "";
  controls.id = "my-activity-empty-controls";
  controls.getBoundingClientRect = vi.fn(() => new DOMRect(0, 710, 360, 50));
  document.body.append(controls);
  return { header, filters, controls, scrollTo: window.scrollTo as ReturnType<typeof vi.fn> };
}

test("mobile empty activity lands below the sticky header with actions in view", () => {
  const { controls, scrollTo } = setup();
  controls.getBoundingClientRect = vi.fn(() => new DOMRect(0, 1000, 360, 50));
  const view = render(<MyActivityLandingScroll filter="completion" revealControls enabled />);
  expect(scrollTo).toHaveBeenCalledWith({ top: 366, behavior: "auto" });

  view.rerender(<MyActivityLandingScroll filter="completed" revealControls enabled />);
  expect(scrollTo).toHaveBeenCalledTimes(2);
});

test.each(activityFilters)("%s aligns filters on mobile and preserves selected-detail scroll", filter => {
  const { scrollTo } = setup();
  const view = render(<MyActivityLandingScroll filter={filter} revealControls={false} enabled />);
  expect(scrollTo).toHaveBeenCalledWith({ top: 248, behavior: "auto" });

  scrollTo.mockClear();
  view.rerender(<MyActivityLandingScroll filter={filter} revealControls={false} enabled={false} />);
  expect(scrollTo).not.toHaveBeenCalled();
});

test.each(activityFilters.filter(([filter]) => filter !== "active"))("%s does not change the existing desktop landing", filter => {
  const { scrollTo } = setup(false);
  render(<MyActivityLandingScroll filter={filter} revealControls enabled />);
  expect(scrollTo).not.toHaveBeenCalled();
});

test("each mobile filter change realigns even when cards already exist", () => {
  const { scrollTo } = setup();
  const view = render(<MyActivityLandingScroll filter="all" revealControls={false} enabled />);
  for (const [index, [filter]] of activityFilters.entries()) {
    view.rerender(<MyActivityLandingScroll filter={filter} revealControls={false} enabled />);
    expect(scrollTo).toHaveBeenCalledTimes(index + 1);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 248, behavior: "auto" });
  }
});
