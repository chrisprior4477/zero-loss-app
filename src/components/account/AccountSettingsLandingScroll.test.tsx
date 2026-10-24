import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AccountSettingsLandingScroll } from "./AccountSettingsLandingScroll";

afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  document.querySelectorAll("[data-settings-scroll-fixture]").forEach(element => element.remove());
  Reflect.deleteProperty(document, "fonts");
  window.history.replaceState({}, "", "/");
});

function setup({ mobile = true, path = "/account/security", hash = "" } = {}) {
  window.history.replaceState({}, "", `${path}${hash}`);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: mobile })));
  let scrollY = 0; let headerHeight = 80;
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
  const scrollTo = vi.fn(({ top }: ScrollToOptions) => { scrollY = Number(top); });
  vi.stubGlobal("scrollTo", scrollTo);
  const frames = new Map<number, FrameRequestCallback>(); let nextId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++nextId, callback); return nextId; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  const flush = () => act(() => {
    while (frames.size) { const [id, callback] = frames.entries().next().value!; frames.delete(id); callback(0); }
  });
  let resized = () => {};
  vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() {} });
  const siteHeader = document.createElement("header"); siteHeader.className = "sticky";
  siteHeader.dataset.settingsScrollFixture = "";
  siteHeader.getBoundingClientRect = () => new DOMRect(0, 0, 390, headerHeight);
  const container = document.createElement("main"); container.dataset.settingsScrollFixture = "";
  for (const [id, top] of [["account-settings-intro", 400], ["account-settings-sections", 600], ["profile-intro", 800], ["security-controls", 1000]] as const) {
    const element = document.createElement("div"); element.id = id;
    element.getBoundingClientRect = () => new DOMRect(0, top - scrollY, 390, 150);
    container.append(element);
  }
  document.body.append(siteHeader, container);
  return { scrollTo, flush, container, setHeaderHeight: (height: number) => { headerHeight = height; act(() => resized()); } };
}

test("Account & Security opens at its heading below the actual mobile header", () => {
  const { scrollTo, flush, container } = setup();
  render(<AccountSettingsLandingScroll target="account-settings-intro" />); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 308, behavior: "instant" });
  expect(container.style.getPropertyValue("--settings-header-bottom")).toBe("80px");
});

test.each(["/account/profile", "/account/payment-methods", "/account/crew/display"])("direct %s links retain the four section buttons", path => {
  const { scrollTo, flush } = setup({ path });
  render(<AccountSettingsLandingScroll target="account-settings-sections" />); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 508, behavior: "instant" });
});

test.each([["#account-settings-sections", 508], ["#profile-intro", 508], ["#security-controls", 908]])("respects section and deeper links: %s", (hash, top) => {
  const { scrollTo, flush } = setup({ hash });
  render(<AccountSettingsLandingScroll target="account-settings-intro" />); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top, behavior: "instant" });
});

test("a same-page click reveals a deeper control and repeated clicks still work", () => {
  const { scrollTo, flush } = setup();
  render(<AccountSettingsLandingScroll target="account-settings-intro" />); flush();
  const anchor = document.createElement("a"); anchor.href = "#security-controls";
  anchor.addEventListener("click", event => event.preventDefault());
  document.querySelector("main")!.append(anchor);
  fireEvent.pointerDown(anchor); fireEvent.click(anchor); flush();
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 908, behavior: "instant" });
  scrollTo({ top: 100 }); scrollTo.mockClear();
  fireEvent.pointerDown(anchor); fireEvent.click(anchor); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 908, behavior: "instant" });
});

test("header settling corrects the landing until the user starts scrolling", () => {
  const { scrollTo, flush, setHeaderHeight } = setup();
  render(<AccountSettingsLandingScroll target="account-settings-intro" />); flush();
  setHeaderHeight(64); flush();
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 324, behavior: "instant" });
  fireEvent.touchStart(window); setHeaderHeight(72); flush();
  expect(scrollTo).toHaveBeenCalledTimes(2);
});

test("reopening the current account page from any plain link returns to its heading", () => {
  const { scrollTo, flush } = setup({ hash: "#security-controls" });
  render(<AccountSettingsLandingScroll target="account-settings-intro" />); flush();
  const anchor = document.createElement("a"); anchor.href = "/account/security";
  anchor.addEventListener("click", event => event.preventDefault());
  document.querySelector("main")!.append(anchor);
  scrollTo.mockClear(); fireEvent.pointerDown(anchor); fireEvent.click(anchor); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 308, behavior: "instant" });
});

test("rerenders and viewport changes do not interrupt reading, but another settings page lands again", () => {
  const { scrollTo, flush } = setup();
  const view = render(<AccountSettingsLandingScroll target="account-settings-sections" visitKey="profile" />); flush();
  scrollTo({ top: 900 }); scrollTo.mockClear();
  view.rerender(<AccountSettingsLandingScroll target="account-settings-sections" visitKey="profile" />);
  fireEvent(window, new Event("resize")); flush(); expect(scrollTo).not.toHaveBeenCalled();
  view.rerender(<AccountSettingsLandingScroll target="account-settings-sections" visitKey="payment" />); flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 508, behavior: "instant" });
});

test("desktop retains normal page positioning", () => {
  const { scrollTo, flush } = setup({ mobile: false });
  render(<AccountSettingsLandingScroll target="account-settings-intro" />); flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test.each(["ready", "unmount", "touch"])("waits for fonts without stealing a later interaction: %s", async outcome => {
  const { scrollTo, flush, container } = setup(); let ready!: () => void;
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready: new Promise<void>(resolve => { ready = resolve; }) } });
  const view = render(<AccountSettingsLandingScroll target="account-settings-intro" />); flush();
  expect(scrollTo).not.toHaveBeenCalled();
  if (outcome === "unmount") view.unmount();
  if (outcome === "touch") fireEvent.touchStart(window);
  await act(async () => ready()); flush();
  expect(scrollTo).toHaveBeenCalledTimes(outcome === "ready" ? 1 : 0);
  if (outcome === "unmount") expect(container.style.getPropertyValue("--settings-header-bottom")).toBe("");
});
