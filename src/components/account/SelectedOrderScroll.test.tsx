import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SelectedOrderScroll } from "./SelectedOrderScroll";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test("reveals the selected order below the measured header after navigation settles", () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 500);
  render(<><header className="sticky" /><div id="order-exact" /><SelectedOrderScroll targetId="order-exact" /></>);
  vi.spyOn(document.querySelector("header")!, "getBoundingClientRect").mockReturnValue({ bottom: 132 } as DOMRect);
  vi.spyOn(document.getElementById("order-exact")!, "getBoundingClientRect").mockReturnValue({ top: 700 } as DOMRect);
  act(() => frames.shift()!(0));
  expect(window.scrollTo).not.toHaveBeenCalled();
  act(() => frames.shift()!(0));
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 1056, behavior: "auto" });
});
