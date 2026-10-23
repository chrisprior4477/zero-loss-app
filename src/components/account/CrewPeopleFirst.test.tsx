import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CrewPeopleFirst } from "./CrewPeopleFirst";

vi.mock("next/image", () => ({ default: () => null }));
beforeEach(() => {
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number; pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? "mouse";
    }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function setup({ reduced = false, overflow = true } = {}) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced })));
  const onMemberPicks = vi.fn(), onSamplePicks = vi.fn(), onAdd = vi.fn();
  render(<CrewPeopleFirst people={[{ memberId: "member", invitationId: "invite", name: "Chris P.", avatarUrl: null }]} samples={["Maya", "Daniel", "Ari", "Leo"]} selectedKey="sample-Maya" onAdd={onAdd} onMemberPicks={onMemberPicks} onSamplePicks={onSamplePicks} onRemove={vi.fn()} onSampleRemove={vi.fn()} pending={false} />);
  const rail = screen.getByRole("group", { name: "People in your Crew" });
  let captured = false;
  Object.defineProperties(rail, {
    clientWidth: { configurable: true, value: 300 },
    scrollWidth: { configurable: true, value: overflow ? 852 : 300 },
    scrollLeft: { configurable: true, value: 0, writable: true },
    scrollTo: { configurable: true, value: vi.fn() },
    scrollBy: { configurable: true, value: vi.fn() },
    setPointerCapture: { configurable: true, value: vi.fn(() => { captured = true; }) },
    hasPointerCapture: { configurable: true, value: vi.fn(() => captured) },
    releasePointerCapture: { configurable: true, value: vi.fn(() => { captured = false; }) },
  });
  rail.style.columnGap = "10px";
  [...rail.children].forEach((card, i) => vi.spyOn(card, "getBoundingClientRect").mockImplementation(() => new DOMRect(i * 142 - rail.scrollLeft, 0, 132, 170)));
  const first = screen.getByRole("button", { name: "See Chris P.'s shared activity" });
  return { rail, first, onMemberPicks, onSamplePicks, onAdd };
}

function pull(target: HTMLElement, distance = 200, pointerType = "mouse", button = 0) {
  fireEvent.pointerDown(target, { pointerId: 5, pointerType, button, clientX: 250, clientY: 10 });
  fireEvent.pointerMove(target, { pointerId: 5, pointerType, clientX: 250 - distance, clientY: 10 });
}

test("drag follows the mouse, settles smoothly, and does not select a person", () => {
  const { rail, first, onMemberPicks } = setup();
  pull(first);
  expect(rail.scrollLeft).toBe(200);
  expect(rail.dataset.dragging).toBe("true");
  expect(rail.setPointerCapture).toHaveBeenCalledWith(5);
  expect(fireEvent.dragStart(first)).toBe(false);
  fireEvent.pointerUp(rail, { pointerId: 5 });
  expect(rail.dataset.dragging).toBeUndefined();
  expect(rail.scrollTo).toHaveBeenCalledWith({ left: 142, behavior: "smooth" });
  expect(rail.dataset.settling).toBe("true");
  rail.scrollLeft = 142; fireEvent.scroll(rail);
  expect(rail.dataset.settling).toBeUndefined();
  expect(rail.releasePointerCapture).toHaveBeenCalledWith(5);
  expect(fireEvent.click(first, { detail: 1 })).toBe(false);
  expect(onMemberPicks).not.toHaveBeenCalled();
  fireEvent.pointerDown(first, { clientX: 40, pointerId: 6 });
  fireEvent.pointerUp(first, { clientX: 40, pointerId: 6 });
  fireEvent.click(first, { detail: 1 });
  expect(onMemberPicks).toHaveBeenCalledWith("member");
});

test("small movements remain clicks and every person and Add person stays clickable", () => {
  const { rail, first, onMemberPicks, onSamplePicks, onAdd } = setup();
  pull(first, 3); fireEvent.pointerUp(first, { pointerId: 5 }); fireEvent.click(first, { detail: 1 });
  expect(onMemberPicks).toHaveBeenCalledWith("member");
  expect(rail.scrollLeft).toBe(0);
  expect(rail.scrollTo).not.toHaveBeenCalled();
  for (const name of ["Maya", "Daniel", "Ari", "Leo"]) {
    fireEvent.click(screen.getByRole("button", { name: `See ${name}'s sample shared activity` }));
    expect(onSamplePicks).toHaveBeenLastCalledWith(name);
  }
  fireEvent.click(screen.getByRole("button", { name: "Add to Your Crew" }));
  expect(onAdd).toHaveBeenCalledOnce();
  expect(screen.queryByText("Sample preview")).toBeNull();
  expect(screen.getByText(/Fictional sample profiles/)).toBeTruthy();
});

test.each(["touch", "pen"])("%s scrolling remains native", pointerType => {
  const { rail } = setup(); pull(rail, 200, pointerType);
  fireEvent.pointerUp(rail, { pointerId: 5, pointerType });
  expect(rail.setPointerCapture).not.toHaveBeenCalled();
  expect(rail.scrollTo).not.toHaveBeenCalled();
});

test.each(["pointerCancel", "lostPointerCapture"] as const)("%s clears drag state", event => {
  const { rail, first, onMemberPicks } = setup(); pull(first);
  fireEvent[event](rail, { pointerId: 5 });
  expect(rail.dataset.dragging).toBeUndefined();
  fireEvent.pointerMove(rail, { clientX: 10, pointerId: 5 });
  expect(rail.scrollLeft).toBe(200);
  fireEvent.click(first, { detail: 1 }); expect(onMemberPicks).toHaveBeenCalledOnce();
});

test("keyboard selection still works after a drag", () => {
  const { rail, first, onMemberPicks } = setup(); pull(first);
  fireEvent.pointerUp(rail, { pointerId: 5 }); fireEvent.click(first, { detail: 0 });
  expect(onMemberPicks).toHaveBeenCalledOnce();
});

test.each([false, true])("chevrons and settling respect reduced motion: %s", reduced => {
  const { rail } = setup({ reduced });
  fireEvent.click(screen.getByRole("button", { name: "Next Crew member" }));
  expect(rail.scrollBy).toHaveBeenCalledWith({ left: 142, behavior: reduced ? "auto" : "smooth" });
  fireEvent.click(screen.getByRole("button", { name: "Previous Crew member" }));
  expect(rail.scrollBy).toHaveBeenLastCalledWith({ left: -142, behavior: reduced ? "auto" : "smooth" });
  pull(rail); fireEvent.pointerUp(rail, { pointerId: 5 });
  expect(rail.scrollTo).toHaveBeenCalledWith({ left: 142, behavior: reduced ? "auto" : "smooth" });
});

test("non-scrolling collections, right clicks, vertical gestures, and unrelated pointers are not grabbed", () => {
  const { rail } = setup({ overflow: false }); pull(rail);
  expect(rail.setPointerCapture).not.toHaveBeenCalled();
  Object.defineProperty(rail, "scrollWidth", { value: 852 });
  pull(rail, 200, "mouse", 2);
  fireEvent.pointerDown(rail, { pointerId: 5, clientX: 250, clientY: 10 });
  fireEvent.pointerMove(rail, { pointerId: 6, clientX: 50, clientY: 10 });
  fireEvent.pointerMove(rail, { pointerId: 5, clientX: 230, clientY: 80 });
  expect(rail.setPointerCapture).not.toHaveBeenCalled();
});
