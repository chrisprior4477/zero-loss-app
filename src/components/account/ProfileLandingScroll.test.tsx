import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ProfileLandingScroll } from "./ProfileLandingScroll";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

test("the account-menu profile link lands its card below the sticky mobile header", () => {
  window.history.replaceState({}, "", "/account/profile#profile-intro");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  const scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.push(callback); return frames.length; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 200 });
  const siteHeader = document.createElement("header");
  siteHeader.className = "sticky";
  siteHeader.getBoundingClientRect = vi.fn(() => new DOMRect(0, 0, 390, 150));
  const profile = document.createElement("section");
  profile.id = "profile-intro";
  profile.getBoundingClientRect = vi.fn(() => new DOMRect(0, 610, 390, 300));
  document.body.append(siteHeader, profile);
  try {
    render(<ProfileLandingScroll />);
    frames.shift()?.(0);
    frames.shift()?.(0);
    expect(scrollTo).toHaveBeenCalledWith({ top: 648, behavior: "auto" });
  } finally {
    siteHeader.remove();
    profile.remove();
    if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
  }
});

test("ordinary profile visits and desktop navigation keep their current position", () => {
  const scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  window.history.replaceState({}, "", "/account/profile#profile-intro");
  render(<ProfileLandingScroll />);
  expect(scrollTo).not.toHaveBeenCalled();
});
