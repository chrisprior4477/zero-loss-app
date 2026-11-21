import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { SupportCasePages } from "./SupportCasePages";

afterEach(cleanup);

test("a refreshed case moves to Waiting for you without changing the visible page", () => {
  const props = { timeZone: "UTC", initialPage: 1, pageSize: 1, base: "/support" };
  const first = { id: "first", case_number: "1", subject: "First case", status: "open" };
  const second = { id: "second", case_number: "2", subject: "Second case", status: "open" };
  const view = render(<SupportCasePages {...props} cases={[first, second]} />);
  expect(screen.getByText("Second case")).toBeTruthy();
  view.rerender(<SupportCasePages {...props} cases={[{ ...second, status: "awaiting_customer" }, first]} />);
  const waiting = screen.getByRole("region", { name: "Waiting for you" });
  expect(within(waiting).getByText("Second case")).toBeTruthy();
  expect(screen.queryByText("First case")).toBeNull();
});
