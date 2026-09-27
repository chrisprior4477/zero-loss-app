import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { DesktopHeaderSearchFallback } from "./DesktopHeaderSearch";

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
