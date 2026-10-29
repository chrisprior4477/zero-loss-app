import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DeleteCardToast } from "./DeleteCardToast";
afterEach(() => { cleanup(); vi.useRealTimers(); });
test("the countdown keeps a card unless deletion is explicitly confirmed", () => {
  vi.useFakeTimers(); const undo=vi.fn(), remove=vi.fn();
  render(<DeleteCardToast busy={false} onUndo={undo} onDelete={remove} />);
  expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("30 seconds");
  act(() => vi.advanceTimersByTime(10_000));
  expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("20 seconds");
  act(() => vi.advanceTimersByTime(20_000));
  expect(undo).toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
});
test("Undo keeps the card and Yes, delete confirms it", () => {
  const undo=vi.fn(), remove=vi.fn();
  render(<DeleteCardToast busy={false} onUndo={undo} onDelete={remove} />);
  fireEvent.click(screen.getByRole("button",{name:"Undo"})); expect(undo).toHaveBeenCalledOnce(); expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Yes, delete"})); expect(remove).toHaveBeenCalledOnce();
});
