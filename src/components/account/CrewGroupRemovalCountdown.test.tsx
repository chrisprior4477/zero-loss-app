import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CrewGroupRemovalCountdown } from "./CrewGroupRemovalCountdown";

afterEach(() => { cleanup(); vi.useRealTimers(); });

test("counts down for 30 seconds and keeps the group when time runs out", () => {
  vi.useFakeTimers();
  const undo = vi.fn(), confirm = vi.fn();
  render(<CrewGroupRemovalCountdown name="Football" busy={false} onUndo={undo} onConfirm={confirm} />);
  expect(screen.getByText("Remove “Football”?" )).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Undo" }));
  act(() => vi.advanceTimersByTime(10_000));
  expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("20 seconds");
  act(() => vi.advanceTimersByTime(20_000));
  expect(undo).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
});

test("a late confirmation after a suspended timer keeps the group", () => {
  vi.useFakeTimers();
  const undo = vi.fn(), confirm = vi.fn();
  render(<CrewGroupRemovalCountdown name="Football" busy={false} onUndo={undo} onConfirm={confirm} />);
  vi.setSystemTime(Date.now() + 31_000);
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  expect(undo).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
});

test("confirms once and does not time out an in-flight removal", () => {
  vi.useFakeTimers();
  const undo = vi.fn(), confirm = vi.fn();
  const view = render(<CrewGroupRemovalCountdown name="Football" busy={false} onUndo={undo} onConfirm={confirm} />);
  const button = screen.getByRole("button", { name: "Confirm removal" });
  fireEvent.click(button); fireEvent.click(button);
  expect(confirm).toHaveBeenCalledOnce();
  view.rerender(<CrewGroupRemovalCountdown name="Football" busy onUndo={undo} onConfirm={confirm} />);
  act(() => vi.advanceTimersByTime(31_000));
  expect(undo).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Undo" })).toHaveProperty("disabled", true);
});

test("unmounting a confirmation leaves no delayed action", () => {
  vi.useFakeTimers();
  const undo = vi.fn(), confirm = vi.fn();
  const view = render(<CrewGroupRemovalCountdown name="Football" busy={false} onUndo={undo} onConfirm={confirm} />);
  view.unmount();
  act(() => vi.advanceTimersByTime(31_000));
  expect(undo).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
});
