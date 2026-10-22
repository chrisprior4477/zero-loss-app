import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { CrewLandingScroll } from "./CrewLandingScroll";

afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  document.querySelectorAll("[data-scroll-fixture]").forEach(element => element.remove());
  window.history.replaceState({}, "", "/");
});

function setup({ mobile = true, hash = "", headerHeight = 48 } = {}) {
  window.history.replaceState({}, "", "/account/crew" + hash);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: mobile })));
  vi.stubGlobal("scrollY", 200);
  const scrollTo = vi.fn(); vi.stubGlobal("scrollTo", scrollTo);
  const frames = new Map<number, FrameRequestCallback>(); let nextId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++nextId, callback); return nextId; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  const flush = () => act(() => {
    while (frames.size) { const [id, callback] = frames.entries().next().value!; frames.delete(id); callback(0); }
  });
  const header = document.createElement("header"); header.dataset.scrollFixture = ""; header.className = "sticky";
  header.getBoundingClientRect = () => new DOMRect(0, 0, 390, headerHeight);
  const heading = document.createElement("header"); heading.id = "crew-intro"; heading.dataset.scrollFixture = "";
  heading.getBoundingClientRect = () => new DOMRect(0, 500, 390, 100);
  document.body.append(header, heading);
  return { scrollTo, flush, frames, heading };
}

test.each([48, 57, 91, 128, 180])("mobile Crew lands below a %ipx sticky header", headerHeight => {
  const { scrollTo, flush } = setup({ headerHeight });
  render(<CrewLandingScroll enabled />); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 700 - headerHeight - 12, behavior: "auto" });
});

test("plain tablet and desktop visits keep their overview", () => {
  const { scrollTo, flush } = setup({ mobile: false });
  render(<CrewLandingScroll enabled />); flush(); expect(scrollTo).not.toHaveBeenCalled();
});

test("request, sharing, invite and member destinations are not overridden", () => {
  const { scrollTo, flush } = setup();
  render(<CrewLandingScroll enabled={false} />); flush(); expect(scrollTo).not.toHaveBeenCalled();
});

test("rerenders do not pull the customer back after scrolling", () => {
  const { scrollTo, flush } = setup();
  const view = render(<CrewLandingScroll enabled />); flush();
  view.rerender(<CrewLandingScroll enabled />); flush(); expect(scrollTo).toHaveBeenCalledOnce();
});

test("explicit anchors are respected until the menu returns to the Crew heading", () => {
  const { scrollTo, flush } = setup({ hash: "#crew-search" });
  render(<CrewLandingScroll enabled />); flush(); expect(scrollTo).not.toHaveBeenCalled();
  window.history.replaceState({}, "", "/account/crew#crew-intro");
  act(() => window.dispatchEvent(new HashChangeEvent("hashchange"))); flush(); expect(scrollTo).toHaveBeenCalledOnce();
});

test("leaving the page cancels scheduled scrolling and its listener", () => {
  const { scrollTo, flush, frames } = setup();
  const view = render(<CrewLandingScroll enabled />); view.unmount();
  act(() => window.dispatchEvent(new HashChangeEvent("hashchange"))); flush();
  expect(scrollTo).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
});

test("a missing heading is safe", () => {
  const { scrollTo, flush, heading } = setup(); heading.remove();
  render(<CrewLandingScroll enabled />); flush(); expect(scrollTo).not.toHaveBeenCalled();
});
