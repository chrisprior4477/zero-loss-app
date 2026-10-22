import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RewardHistoryCarousel } from "./RewardHistoryCarousel";

beforeEach(() => {
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number; pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? "mouse";
    }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function setup({ narrow = true, reduced = false, overflow = true } = {}) {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query.includes("reduced-motion") ? reduced : narrow })));
  const navigate = vi.fn();
  const view = render(<RewardHistoryCarousel><a href="#first" onClick={navigate}>First reward</a><a href="#second" onClick={navigate}>Second reward</a></RewardHistoryCarousel>);
  const rail = screen.getByRole("group", { name: "Reward cards" });
  let captured = false;
  Object.defineProperties(rail, {
    clientWidth: { configurable: true, value: 300 },
    scrollWidth: { configurable: true, value: overflow ? 600 : 300 },
    scrollLeft: { configurable: true, value: 0, writable: true },
    scrollTo: { configurable: true, value: vi.fn() },
    setPointerCapture: { configurable: true, value: vi.fn(() => { captured = true; }) },
    hasPointerCapture: { configurable: true, value: vi.fn(() => captured) },
    releasePointerCapture: { configurable: true, value: vi.fn(() => { captured = false; }) },
  });
  const first = screen.getByRole("link", { name: "First reward" });
  const second = screen.getByRole("link", { name: "Second reward" });
  vi.spyOn(first, "getBoundingClientRect").mockImplementation(() => new DOMRect(-rail.scrollLeft, 0, 280, 140));
  vi.spyOn(second, "getBoundingClientRect").mockImplementation(() => new DOMRect(290 - rail.scrollLeft, 0, 280, 140));
  return { rail, first, navigate, view };
}

function pull(rail: HTMLElement, distance = 200, pointerType = "mouse", button = 0) {
  fireEvent.pointerDown(rail, { pointerId: 5, pointerType, button, clientX: 250, clientY: 10 });
  fireEvent.pointerMove(rail, { pointerId: 5, pointerType, clientX: 250 - distance, clientY: 10 });
}

test("mouse dragging follows the pointer and smoothly snaps without opening the reward", () => {
  const { rail, first, navigate } = setup();
  pull(first);
  expect(rail.scrollLeft).toBe(200);
  expect(rail.dataset.dragging).toBe("true");
  expect(rail.setPointerCapture).toHaveBeenCalledWith(5);
  expect(fireEvent.dragStart(first)).toBe(false);
  fireEvent.pointerUp(rail, { pointerId: 5 });
  expect(rail.dataset.dragging).toBeUndefined();
  expect(rail.scrollTo).toHaveBeenCalledWith({ left: 290, behavior: "smooth" });
  expect(rail.dataset.settling).toBe("true");
  rail.scrollLeft = 290;
  fireEvent.scroll(rail);
  expect(rail.dataset.settling).toBeUndefined();
  expect(rail.releasePointerCapture).toHaveBeenCalledWith(5);
  // Browsers emit this click after pointerup, even though the gesture was a drag.
  expect(fireEvent.click(first, { detail: 1 })).toBe(false);
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.pointerDown(first, { clientX: 40, pointerId: 6 });
  fireEvent.pointerUp(first, { clientX: 40, pointerId: 6 });
  fireEvent.click(first, { detail: 1 });
  expect(navigate).toHaveBeenCalledOnce();
});

test("small mouse movements preserve click-to-open", () => {
  const { rail, first, navigate } = setup();
  pull(first, 3);
  fireEvent.pointerUp(first, { pointerId: 5 });
  fireEvent.click(first, { detail: 1 });
  expect(rail.scrollLeft).toBe(0);
  expect(rail.scrollTo).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledOnce();
});

test.each(["touch", "pen"])("%s gestures remain entirely native", pointerType => {
  const { rail } = setup();
  pull(rail, 200, pointerType);
  fireEvent.pointerUp(rail, { pointerId: 5, pointerType });
  expect(rail.scrollLeft).toBe(0);
  expect(rail.setPointerCapture).not.toHaveBeenCalled();
  expect(rail.scrollTo).not.toHaveBeenCalled();
});

test.each([{ narrow: false }, { overflow: false }])("does not take over wide tables or non-scrolling collections: %j", options => {
  const { rail } = setup(options);
  pull(rail);
  fireEvent.pointerUp(rail, { pointerId: 5 });
  expect(rail.scrollLeft).toBe(0);
  expect(rail.scrollTo).not.toHaveBeenCalled();
});

test("right clicks and unrelated pointers do not drag", () => {
  const { rail } = setup();
  pull(rail, 200, "mouse", 2);
  expect(rail.scrollLeft).toBe(0);
  fireEvent.pointerDown(rail, { clientX: 250, pointerId: 5 });
  fireEvent.pointerMove(rail, { clientX: 50, pointerId: 6 });
  expect(rail.scrollLeft).toBe(0);
});

test.each(["pointerCancel", "lostPointerCapture"] as const)("%s cleans up a drag without a stuck grabbing cursor", event => {
  const { rail, first, navigate } = setup();
  pull(first);
  fireEvent[event](rail, { pointerId: 5 });
  expect(rail.dataset.dragging).toBeUndefined();
  expect(rail.scrollTo).not.toHaveBeenCalled();
  fireEvent.pointerMove(rail, { clientX: 20, pointerId: 5 });
  expect(rail.scrollLeft).toBe(200);
  fireEvent.click(first, { detail: 1 });
  expect(navigate).toHaveBeenCalledOnce();
});

test("keyboard activation remains available after a drag", () => {
  const { rail, first, navigate } = setup();
  pull(first);
  fireEvent.pointerUp(rail, { pointerId: 5 });
  fireEvent.click(first, { detail: 0 });
  expect(navigate).toHaveBeenCalledOnce();
  expect(rail.tabIndex).toBe(0);
});

test("reduced motion skips the snap animation", () => {
  const { rail } = setup({ reduced: true });
  pull(rail);
  fireEvent.pointerUp(rail, { pointerId: 5 });
  expect(rail.scrollTo).toHaveBeenCalledWith({ left: 290, behavior: "auto" });
});

test("a mostly vertical mouse gesture is not converted into a horizontal drag", () => {
  const { rail } = setup();
  fireEvent.pointerDown(rail, { clientX: 250, clientY: 10, pointerId: 5 });
  fireEvent.pointerMove(rail, { clientX: 230, clientY: 80, pointerId: 5 });
  expect(rail.scrollLeft).toBe(0);
  expect(rail.dataset.dragging).toBeUndefined();
});
