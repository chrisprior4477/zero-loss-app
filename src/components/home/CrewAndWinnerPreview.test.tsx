import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CrewAndWinnerPreview } from "./CrewAndWinnerPreview";

afterEach(cleanup);

test("the sample Crew action is clearly a preview, not a sent invitation", () => {
  render(<CrewAndWinnerPreview />);

  fireEvent.click(screen.getAllByRole("button", { name: "Add to Crew" })[0]);

  expect(screen.getByRole("status").textContent).toContain("no invitation was sent to Maya");
  expect(screen.getByRole("button", { name: "Preview added" })).toBeTruthy();
});

test("fictional winner scenes open an honest sample disclosure", () => {
  render(<CrewAndWinnerPreview />);

  fireEvent.click(screen.getByRole("button", { name: "Open illustrative story preview: A TV day at home" }));

  expect(screen.getByRole("dialog").textContent).toContain("not a real winner account");
  fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("Crew ends with a clickable discovery tile and stories have twelve sample cards", () => {
  render(<CrewAndWinnerPreview />);

  expect(screen.getAllByRole("button", { name: "Add to Crew" })).toHaveLength(4);
  expect(screen.getAllByRole("button", { name: /Open illustrative story preview:/ })).toHaveLength(12);

  expect(screen.getAllByRole("button", { name: "Add to Your Crew" })).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Add to Your Crew" })[1]);
  expect(screen.getByRole("dialog", { name: "Add to Your Crew" })).toBeTruthy();
  expect(screen.getByRole("dialog").textContent).toContain("both people choose to connect");

  fireEvent.change(screen.getByRole("searchbox", { name: "Search by name" }), { target: { value: "Maya" } });
  fireEvent.click(screen.getByRole("button", { name: "Search Crew by name" }));
  expect(screen.getByText("Fictional sample profile")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Close Crew search" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
