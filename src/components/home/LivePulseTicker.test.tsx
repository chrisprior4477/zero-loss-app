import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LivePulseTicker } from "./LivePulseTicker";

const navigate = vi.fn();
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} onClick={event => { event.preventDefault(); navigate(); }} /> }));
vi.mock("./useVisibleMotion", () => ({ useVisibleMotion: () => false }));
beforeEach(() => {
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number; isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true;
    }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); navigate.mockClear(); });

function setup() {
  render(<LivePulseTicker items={[{ label: "AirPods Pro", value: "Only 2 left", href: "/items/airpods-pro", tone: "urgent" }]} />);
  const rail = screen.getByLabelText("Drag marketplace activity forward or backward");
  const link = screen.getByRole("link", { name: "AirPods Pro Only 2 left" });
  let captured = false;
  Object.assign(rail, { setPointerCapture: vi.fn(() => { captured = true; }), hasPointerCapture: () => captured, releasePointerCapture: vi.fn(() => { captured = false; }) });
  return { rail, link };
}

test("removes the Sample badge, exposes real links once for keyboard users, and keeps repeated copies clickable", () => {
  const { rail, link } = setup();
  expect(screen.queryByText("Sample")).toBeNull();
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(link.getAttribute("href")).toBe("/items/airpods-pro");
  expect(rail.querySelectorAll("a")[1].tabIndex).toBe(-1);
  fireEvent.click(rail.querySelectorAll("a")[1]);
  expect(navigate).toHaveBeenCalledOnce();
});

test("a click or small hand movement still opens the listing", () => {
  const { rail, link } = setup();
  fireEvent.pointerDown(link, { clientX: 150, clientY: 10 });
  fireEvent.pointerMove(link, { clientX: 147, clientY: 10 });
  fireEvent.pointerUp(link);
  fireEvent.click(link, { detail: 1 });
  expect(rail.setPointerCapture).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledOnce();
});

test("pointer focus does not shift the link underneath an in-progress tap", () => {
  const { link } = setup();
  const measure = vi.spyOn(link, "getBoundingClientRect");
  fireEvent.pointerDown(link, { clientX: 150, clientY: 10 });
  fireEvent.focus(link);
  expect(measure).not.toHaveBeenCalled();
  fireEvent.pointerUp(link);
  fireEvent.click(link, { detail: 1 });
  expect(navigate).toHaveBeenCalledOnce();
});

test("dragging captures only after the threshold and suppresses its click, but the next click works", () => {
  const { rail, link } = setup();
  fireEvent.pointerDown(link, { clientX: 150, clientY: 10 });
  fireEvent.pointerMove(link, { clientX: 50, clientY: 10 });
  expect(rail.setPointerCapture).toHaveBeenCalledWith(1);
  fireEvent.pointerUp(rail);
  fireEvent.click(link, { detail: 1 });
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.pointerDown(link, { clientX: 40 });
  fireEvent.pointerUp(link);
  fireEvent.click(link, { detail: 1 });
  expect(navigate).toHaveBeenCalledOnce();
});

test("vertical touch scrolling and secondary pointers do not become horizontal drags", () => {
  const { rail, link } = setup();
  fireEvent.pointerDown(link, { clientX: 150, clientY: 10 });
  fireEvent.pointerMove(link, { clientX: 130, clientY: 90 });
  fireEvent.pointerCancel(rail);
  fireEvent.pointerDown(link, { clientX: 150, isPrimary: false });
  fireEvent.pointerMove(link, { clientX: 30 });
  expect(rail.setPointerCapture).not.toHaveBeenCalled();
});

test("keyboard activation remains available after dragging", () => {
  const { rail, link } = setup();
  fireEvent.pointerDown(link, { clientX: 150, clientY: 10 });
  fireEvent.pointerMove(link, { clientX: 50, clientY: 10 });
  fireEvent.pointerUp(rail);
  fireEvent.click(link, { detail: 0 });
  expect(navigate).toHaveBeenCalledOnce();
});
