import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DesktopHeaderSearchFallback } from "./DesktopHeaderSearch";
import { searchExamples } from "@/lib/navigation/search-examples";

afterEach(cleanup);

describe("header search submit cue", () => {
  test("changes the microphone to a visible Go button when a query is entered", () => {
    render(<DesktopHeaderSearchFallback />);
    expect(screen.getByRole("button", { name: "Start voice search" })).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "paper towels" } });
    expect(screen.getByRole("button", { name: "Go to search results" }).textContent).toBe("Go");
    expect(screen.queryByRole("button", { name: "Start voice search" })).toBeNull();
  });
});

test.each(searchExamples)("suggestion %s fills search without navigating until Go", example => {
  const navigate = vi.fn();
  render(<DesktopHeaderSearchFallback navigate={navigate} />);
  fireEvent.focus(screen.getByRole("searchbox"));
  expect(screen.getByRole("group", { name: "Try a search" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: example, exact: true }));
  expect(screen.getByDisplayValue(example)).toBeTruthy();
  expect(navigate).not.toHaveBeenCalled();
  expect(screen.queryByRole("group", { name: "Try a search" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Go to search results" }));
  expect(navigate).toHaveBeenCalledWith(`/browse?q=${encodeURIComponent(example).replaceAll("%20", "+")}#search-results`);
});

test("outside tap and Escape close suggestions, while typing remains available", () => {
  render(<DesktopHeaderSearchFallback />);
  const input = screen.getByRole("searchbox");
  fireEvent.focus(input); fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("group", { name: "Try a search" })).toBeNull();
  fireEvent.click(input); fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("group", { name: "Try a search" })).toBeNull();
  fireEvent.change(input, { target: { value: "other search" } });
  expect(screen.getByDisplayValue("other search")).toBeTruthy();
});
