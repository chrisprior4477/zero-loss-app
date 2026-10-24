import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { NotificationsLandingScroll } from "./NotificationsLandingScroll";

afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  document.querySelectorAll("[data-notifications-scroll-fixture]").forEach(element => element.remove());
  window.history.replaceState({}, "", "/");
});

function setup({ mobile = true, hash = "" } = {}) {
  window.history.replaceState({}, "", `/account/notifications${hash}`);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: mobile })));
  vi.stubGlobal("scrollY", 200);
  const scrollTo = vi.fn(); vi.stubGlobal("scrollTo", scrollTo);
  const frames = new Map<number, FrameRequestCallback>(); let nextId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++nextId, callback); return nextId; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  const flush = () => act(() => {
    while (frames.size) { const [id, callback] = frames.entries().next().value!; frames.delete(id); callback(0); }
  });
  const siteHeader = document.createElement("header");
  siteHeader.dataset.notificationsScrollFixture = ""; siteHeader.className = "sticky";
  siteHeader.getBoundingClientRect = () => new DOMRect(0, 0, 390, 80);
  const container = document.createElement("div"); container.dataset.notificationsScrollFixture = "";
  const heading = document.createElement("header"); heading.id = "notifications-intro";
  heading.getBoundingClientRect = () => new DOMRect(0, 400, 390, 150);
  container.append(heading); document.body.append(siteHeader, container);
  return { scrollTo, flush, frames, container };
}

test("mobile entry reveals Notifications below the measured sticky header without animation", () => {
  const { scrollTo, flush, container } = setup(); render(<NotificationsLandingScroll />); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 508, behavior: "instant" });
  expect(container.style.getPropertyValue("--notifications-header-height")).toBe("80px");
});

test("desktop keeps its overview and ordinary rerenders never interrupt reading", () => {
  const { scrollTo, flush } = setup({ mobile: false });
  const view = render(<NotificationsLandingScroll />); flush(); view.rerender(<NotificationsLandingScroll />); flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test("explicit settings links are not redirected to the heading", () => {
  const { scrollTo, flush } = setup({ hash: "#alert-settings" }); render(<NotificationsLandingScroll />); flush();
  expect(scrollTo).not.toHaveBeenCalled();
  window.history.replaceState({}, "", "/account/notifications#notifications-intro");
  act(() => window.dispatchEvent(new HashChangeEvent("hashchange"))); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 508, behavior: "instant" });
});

test("ordinary mobile rerenders and viewport changes do not jump away from a notification", () => {
  const { scrollTo, flush } = setup(); const view = render(<NotificationsLandingScroll />); flush();
  view.rerender(<NotificationsLandingScroll />);
  act(() => window.dispatchEvent(new Event("resize"))); flush();
  expect(scrollTo).toHaveBeenCalledOnce();
});

test("unmount cancels pending navigation and removes the scoped offset", () => {
  const { scrollTo, flush, frames, container } = setup(); const view = render(<NotificationsLandingScroll />);
  view.unmount(); flush(); expect(frames.size).toBe(0); expect(scrollTo).not.toHaveBeenCalled();
  expect(container.style.getPropertyValue("--notifications-header-height")).toBe("");
});

test.each([false, true])("font loading settles before scrolling; unmounted=%s", async unmounted => {
  const { scrollTo, flush } = setup();
  let fontsReady!: () => void;
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready: new Promise<void>(resolve => { fontsReady = resolve; }) } });
  try {
    const view = render(<NotificationsLandingScroll />); flush(); expect(scrollTo).not.toHaveBeenCalled();
    if (unmounted) view.unmount();
    await act(async () => { fontsReady(); }); flush();
    expect(scrollTo).toHaveBeenCalledTimes(unmounted ? 0 : 1);
  } finally { Reflect.deleteProperty(document, "fonts"); }
});
