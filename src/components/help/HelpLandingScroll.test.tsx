import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { HelpLandingScroll } from "./HelpLandingScroll";

afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  document.querySelectorAll("[data-scroll-fixture]").forEach(element => element.remove());
  window.history.replaceState({}, "", "/");
});
function setup(hash = "") {
  window.history.replaceState({}, "", `/support${hash}`);
  vi.stubGlobal("scrollY", 200);
  const scrollTo = vi.fn(); vi.stubGlobal("scrollTo", scrollTo);
  const frames = new Map<number, FrameRequestCallback>(); let nextId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++nextId, callback); return nextId; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  const flush = () => act(() => {
    while (frames.size) { const [id, callback] = frames.entries().next().value!; frames.delete(id); callback(0); }
  });
  for (const [id, top, height] of [["sticky", 0, 80], ["support-intro", 400, 100], ["case-list", 900, 200], ["conversation", 600, 600]] as const) {
    const element = document.createElement(id === "sticky" ? "header" : "section");
    element.id = id; element.dataset.scrollFixture = "";
    if (id === "sticky") element.className = "sticky";
    element.getBoundingClientRect = () => new DOMRect(0, top, 390, height);
    document.body.append(element);
  }
  return { scrollTo, flush, frames };
}
test("help landing starts beneath the measured header without animation", () => {
  const { scrollTo, flush } = setup(); render(<HelpLandingScroll target="support-intro" />); flush();
  expect(scrollTo).toHaveBeenCalledWith({ top: 508, behavior: "instant" });
  expect(document.documentElement.style.getPropertyValue("--help-header-height")).toBe("80px");
});
test("explicit cases and conversation destinations win over the default heading", () => {
  const { scrollTo, flush } = setup("#case-list"); render(<HelpLandingScroll target="support-intro" />); flush();
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 1008, behavior: "instant" });
  window.history.replaceState({}, "", "/support#conversation");
  act(() => window.dispatchEvent(new HashChangeEvent("hashchange"))); flush();
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 708, behavior: "instant" });
});
test("new case visits scroll but ordinary rerenders do not interrupt reading", () => {
  const { scrollTo, flush } = setup(); const view = render(<HelpLandingScroll target="conversation" visitKey="case-one" />); flush();
  view.rerender(<HelpLandingScroll target="conversation" visitKey="case-one" />); flush(); expect(scrollTo).toHaveBeenCalledOnce();
  view.rerender(<HelpLandingScroll target="conversation" visitKey="case-two" />); flush(); expect(scrollTo).toHaveBeenCalledTimes(2);
});
test("unknown anchors are not overwritten", () => {
  const { scrollTo, flush } = setup("#another-section"); render(<HelpLandingScroll target="support-intro" />); flush(); expect(scrollTo).not.toHaveBeenCalled();
});
test("unmount cancels frames and removes the temporary header measurement", () => {
  const { scrollTo, flush, frames } = setup(); const view = render(<HelpLandingScroll target="support-intro" />); view.unmount(); flush();
  expect(frames.size).toBe(0); expect(scrollTo).not.toHaveBeenCalled(); expect(document.documentElement.style.getPropertyValue("--help-header-height")).toBe("");
});
test("initial deep links wait for font layout before measuring", async () => {
  const { scrollTo, flush } = setup("#conversation");
  let fontsReady!: () => void;
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready: new Promise<void>(resolve => { fontsReady = resolve; }) } });
  try {
    render(<HelpLandingScroll target="support-intro" />); flush(); expect(scrollTo).not.toHaveBeenCalled();
    await act(async () => { fontsReady(); }); flush();
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 708, behavior: "instant" });
  } finally { Reflect.deleteProperty(document, "fonts"); }
});
test("fonts finishing after unmount cannot scroll a different page", async () => {
  const { scrollTo, flush } = setup();
  let fontsReady!: () => void;
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready: new Promise<void>(resolve => { fontsReady = resolve; }) } });
  try {
    const view = render(<HelpLandingScroll target="support-intro" />); view.unmount();
    await act(async () => { fontsReady(); }); flush(); expect(scrollTo).not.toHaveBeenCalled();
  } finally { Reflect.deleteProperty(document, "fonts"); }
});
