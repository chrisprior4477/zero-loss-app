import { useRef } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useRailReturn } from "./useRailReturn";

function Rail({ id = "marketplace", width = 300 }: { id?: string; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useRailReturn(ref, id);
  return <div data-testid={id} ref={element => {
    ref.current = element;
    if (!element) return;
    Object.defineProperties(element, { clientWidth: { configurable: true, value: 500 }, scrollWidth: { configurable: true, value: width * 8 } });
    element.getBoundingClientRect = () => new DOMRect(0, 0, 500, 200);
    Array.from(element.children).forEach((child, index) => { child.getBoundingClientRect = () => new DOMRect(index * width - element.scrollLeft, 0, width, 200); });
  }}>{Array.from({ length: 8 }, (_, index) => <article key={index}><a href={`/items/product-${index}`} onClick={event => event.preventDefault()}>Product {index}</a></article>)}</div>;
}

beforeEach(() => { window.history.replaceState({ __NA: true, tree: "next-router-state" }, "", "/"); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

test("product navigation and remount restore the row while preserving Next history state", () => {
  const view = render(<Rail />);
  const track = screen.getByTestId("marketplace");
  track.scrollLeft = 950;
  fireEvent.click(screen.getByRole("link", { name: "Product 4" }));
  expect(window.history.state.tree).toBe("next-router-state");
  view.unmount();
  render(<Rail />);
  expect(screen.getByTestId("marketplace").scrollLeft).toBe(950);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByTestId("marketplace").scrollLeft).toBe(950);
});

test("returning at a smaller card width retains the same visible product", () => {
  const view = render(<Rail />);
  screen.getByTestId("marketplace").scrollLeft = 950;
  fireEvent.click(screen.getByRole("link", { name: "Product 4" }));
  view.unmount();
  render(<Rail width={190} />);
  expect(screen.getByTestId("marketplace").scrollLeft).toBe(620);
});

test("touch scrolling saves each row independently and stops correcting after the next gesture", () => {
  const view = render(<><Rail /><Rail id="dollar-choice" /></>);
  const first = screen.getByTestId("marketplace"), second = screen.getByTestId("dollar-choice");
  first.scrollLeft = 600; fireEvent.scroll(first);
  second.scrollLeft = 1200; fireEvent.scroll(second);
  act(() => vi.advanceTimersByTime(160));
  view.unmount();
  render(<><Rail /><Rail id="dollar-choice" /></>);
  expect(screen.getByTestId("marketplace").scrollLeft).toBe(600);
  expect(screen.getByTestId("dollar-choice").scrollLeft).toBe(1200);
  fireEvent.pointerDown(screen.getByTestId("marketplace"));
  screen.getByTestId("marketplace").scrollLeft = 750;
  fireEvent.scroll(screen.getByTestId("marketplace"));
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByTestId("marketplace").scrollLeft).toBe(750);
});

test("another page's bookmark is ignored and invalid offsets cannot break the row", () => {
  window.history.replaceState({ zeroLossShoppingRows: { path: "/browse", rows: { marketplace: { left: 900, anchor: null, inset: 0 } } } }, "", "/");
  const view = render(<Rail />);
  expect(screen.getByTestId("marketplace").scrollLeft).toBe(0);
  view.unmount();
  window.history.replaceState({ zeroLossShoppingRows: { path: "/", rows: { marketplace: { left: -100, anchor: null, inset: 0 } } } }, "", "/");
  render(<Rail />);
  expect(screen.getByTestId("marketplace").scrollLeft).toBe(0);
});
