import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { LoginForm } from "./LoginForm";

vi.mock("@/lib/auth/actions", () => ({ signInAction: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("ordinary mobile sign-in links land the form just below the sticky header", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callback(0); return 1; });
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const top = this.id === "login-form" ? 600 : 0;
    const height = this.tagName === "HEADER" ? 163 : 0;
    return { top, height, left: 0, right: 0, bottom: top + height, width: 0, x: 0, y: top, toJSON: () => ({}) };
  });

  render(<><header className="sticky" /><section id="login-form"><LoginForm /></section></>);

  expect(scrollTo).toHaveBeenCalledWith({ top: 429, behavior: "auto" });
});

test("ordinary desktop sign-in leaves the introductory layout in place", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  render(<section id="login-form"><LoginForm /></section>);
  expect(scrollTo).not.toHaveBeenCalled();
});
