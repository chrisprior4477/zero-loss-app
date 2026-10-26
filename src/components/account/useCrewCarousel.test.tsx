import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useCrewCarousel } from "./useCrewCarousel";

let reduced = false;
let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
const activate = vi.fn();
function Carousel() {
  const { rail, move, ...gestures } = useCrewCarousel();
  return <><div ref={rail} data-testid="rail" {...gestures}><button onClick={activate}>Pick</button></div><button onClick={() => move(1)}>Next</button></>;
}
function mount() {
  const view = render(<Carousel />), rail = screen.getByTestId("rail");
  Object.defineProperties(rail, { clientWidth: { value: 200 }, scrollWidth: { value: 600 },
    setPointerCapture: { value: vi.fn() }, hasPointerCapture: { value: () => true }, releasePointerCapture: { value: vi.fn() } });
  vi.spyOn(rail.firstElementChild!, "getBoundingClientRect").mockReturnValue({ width: 100 } as DOMRect);
  return { ...view, rail, card: screen.getByRole("button", { name: "Pick" }) };
}
const pointer = (x: number) => ({ clientX: x, clientY: 20, pointerId: 1, pointerType: "touch", isPrimary: true, button: 0 });
beforeEach(() => {
  reduced = false; frames.clear(); activate.mockClear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number; pointerType: string; isPrimary: boolean;
    constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? "touch"; this.isPrimary = init.isPrimary ?? true; }
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test("a touch drag keeps moving when capture transfers from the card to the carousel", () => {
  const { rail, card } = mount();
  fireEvent.pointerDown(card, pointer(150));
  fireEvent.pointerMove(rail, pointer(110));
  fireEvent.lostPointerCapture(card, pointer(110));
  fireEvent.pointerMove(rail, pointer(70));
  expect(rail.scrollLeft).toBe(80);
  fireEvent.pointerUp(rail, pointer(70));
  expect(frames.size).toBe(1);
});

test("dragging does not activate a product, while a fresh tap and keyboard activation do", () => {
  const { rail, card } = mount();
  fireEvent.pointerDown(card, pointer(150)); fireEvent.pointerMove(rail, pointer(70)); fireEvent.pointerUp(rail, pointer(70));
  fireEvent.click(card, { detail: 1 }); expect(activate).not.toHaveBeenCalled();
  fireEvent.pointerDown(card, pointer(70)); fireEvent.pointerUp(rail, pointer(70)); fireEvent.click(card, { detail: 1 });
  fireEvent.click(card, { detail: 0 }); expect(activate).toHaveBeenCalledTimes(2);
});

test("vertical gestures remain available for scrolling the page", () => {
  const { rail, card } = mount();
  fireEvent.pointerDown(card, pointer(150));
  const vertical = new PointerEvent("pointermove", { ...pointer(148), clientY: 90, bubbles: true, cancelable: true });
  rail.dispatchEvent(vertical);
  expect(vertical.defaultPrevented).toBe(false); expect(rail.scrollLeft).toBe(0);
});

test("reduced motion moves instantly and unmounting cancels a running glide", () => {
  const { rail, unmount } = mount(); reduced = true;
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(rail.scrollLeft).toBe(100); expect(frames.size).toBe(0);
  reduced = false; fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(frames.size).toBe(1); unmount(); expect(frames.size).toBe(0);
});
