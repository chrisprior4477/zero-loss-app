import { act, cleanup, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { useVisibleMotion } from "./useVisibleMotion";

const originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalVisibility) Object.defineProperty(document, "visibilityState", originalVisibility);
  else Reflect.deleteProperty(document, "visibilityState");
});

test("decorative motion only runs while visible, foregrounded, and allowed", () => {
  let notifyIntersection: IntersectionObserverCallback | undefined;
  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) { notifyIntersection = callback; }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

  let reducedMotion = false;
  let notifyMotion: (() => void) | undefined;
  vi.stubGlobal("matchMedia", () => ({
    get matches() { return reducedMotion; },
    addEventListener: (_event: string, listener: () => void) => { notifyMotion = listener; },
    removeEventListener: () => { notifyMotion = undefined; },
  }));

  let visibility: DocumentVisibilityState = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  function MotionProbe() {
    const ref = useRef<HTMLElement>(null);
    const active = useVisibleMotion(ref);
    return <section ref={ref} data-testid="motion">{active ? "moving" : "still"}</section>;
  }

  render(<MotionProbe />);
  expect(screen.getByTestId("motion").textContent).toBe("still");
  act(() => notifyIntersection?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(screen.getByTestId("motion").textContent).toBe("moving");

  act(() => { visibility = "hidden"; document.dispatchEvent(new Event("visibilitychange")); });
  expect(screen.getByTestId("motion").textContent).toBe("still");
  act(() => { visibility = "visible"; document.dispatchEvent(new Event("visibilitychange")); });
  expect(screen.getByTestId("motion").textContent).toBe("moving");

  act(() => { reducedMotion = true; notifyMotion?.(); });
  expect(screen.getByTestId("motion").textContent).toBe("still");
  act(() => { reducedMotion = false; notifyMotion?.(); });
  expect(screen.getByTestId("motion").textContent).toBe("moving");
  act(() => notifyIntersection?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(screen.getByTestId("motion").textContent).toBe("still");
});
