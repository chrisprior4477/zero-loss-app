import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useAccountProfileShortcut } from "./useAccountProfileShortcut";

const navigation = vi.hoisted(() => ({ push: vi.fn(), pathname: "/account/entries" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }), usePathname: () => navigation.pathname }));
const openMenu = vi.fn();
function Trigger({ enabled = true }: { enabled?: boolean }) {
  const shortcut = useAccountProfileShortcut(enabled);
  return <button {...shortcut} onClick={openMenu}>Account</button>;
}
beforeEach(() => {
  vi.useFakeTimers(); navigation.push.mockReset(); openMenu.mockReset(); navigation.pathname = "/account/entries";
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number; pointerType: string; isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? "touch"; this.isPrimary = init.isPrimary ?? true;
    }
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

test.each(["touch", "mouse", "pen"])("a %s hold opens Profile once, and release does not open the drawer", pointerType => {
  render(<Trigger />); const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { pointerType, button: 0, clientX: 20, clientY: 20 });
  act(() => vi.advanceTimersByTime(599)); expect(navigation.push).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1)); expect(navigation.push).toHaveBeenCalledExactlyOnceWith("/account/profile#profile-intro");
  act(() => vi.advanceTimersByTime(1000)); expect(navigation.push).toHaveBeenCalledTimes(1);
  fireEvent.pointerUp(button); fireEvent.click(button); expect(openMenu).not.toHaveBeenCalled();
  fireEvent.pointerDown(button, { pointerType, button: 0 }); fireEvent.pointerUp(button); fireEvent.click(button);
  expect(openMenu).toHaveBeenCalledOnce();
});

test("a normal tap and keyboard activation retain the menu behavior", () => {
  render(<Trigger />); const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 0 }); act(() => vi.advanceTimersByTime(200));
  fireEvent.pointerUp(button); fireEvent.click(button); act(() => vi.advanceTimersByTime(700));
  expect(openMenu).toHaveBeenCalledOnce(); expect(navigation.push).not.toHaveBeenCalled();
  fireEvent.keyDown(button, { key: "Enter" }); fireEvent.click(button, { detail: 0 });
  expect(openMenu).toHaveBeenCalledTimes(2);
});

test.each(["move", "leave", "cancel", "blur", "window-blur", "unmount", "route-change", "disable"])("%s cancels a pending hold", reason => {
  const view = render(<Trigger />); const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 0, clientX: 20, clientY: 20 });
  act(() => vi.advanceTimersByTime(200));
  if (reason === "move") fireEvent.pointerMove(button, { clientX: 20, clientY: 31 });
  if (reason === "leave") fireEvent.pointerLeave(button);
  if (reason === "cancel") fireEvent.pointerCancel(button);
  if (reason === "blur") fireEvent.blur(button);
  if (reason === "window-blur") fireEvent.blur(window);
  if (reason === "unmount") view.unmount();
  if (reason === "route-change") { navigation.pathname = "/browse"; view.rerender(<Trigger />); }
  if (reason === "disable") view.rerender(<Trigger enabled={false} />);
  act(() => vi.advanceTimersByTime(800)); expect(navigation.push).not.toHaveBeenCalled();
});

test("minor finger movement still allows a deliberate hold", () => {
  render(<Trigger />); const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 0, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(button, { clientX: 22, clientY: 22 });
  act(() => vi.advanceTimersByTime(600)); expect(navigation.push).toHaveBeenCalledOnce();
});

test("signed-out and preview buttons cannot use the profile shortcut", () => {
  render(<Trigger enabled={false} />); const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 0 }); act(() => vi.advanceTimersByTime(800));
  fireEvent.pointerUp(button); fireEvent.click(button);
  expect(navigation.push).not.toHaveBeenCalled(); expect(openMenu).toHaveBeenCalledOnce();
});

test("right clicks and secondary pointers do not start navigation", () => {
  render(<Trigger />); const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 2 }); act(() => vi.advanceTimersByTime(800));
  fireEvent.pointerDown(button, { button: 0, isPrimary: false }); act(() => vi.advanceTimersByTime(800));
  expect(navigation.push).not.toHaveBeenCalled();
});
