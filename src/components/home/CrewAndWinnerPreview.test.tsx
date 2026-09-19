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
