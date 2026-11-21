import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ShareWinWithCrew } from "./ShareWinWithCrew";

vi.mock("@/lib/crew/actions", () => ({ getOwnWinShareRecipients: vi.fn(), shareWinWithCrew: vi.fn() }));
afterEach(cleanup);

test("a refreshed recipient list removes stale selections and updates shared status", () => {
  const props = { rewardId: "reward-1", members: [{ id: "one", name: "Avery" }, { id: "two", name: "Morgan" }] };
  const view = render(<ShareWinWithCrew {...props} initialShared={["one"]} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Morgan" }));
  view.rerender(<ShareWinWithCrew {...props} initialShared={["two"]} />);
  expect(screen.getByRole("checkbox", { name: "Morgan · Shared" })).toHaveProperty("checked", false);
  expect(screen.getByRole("checkbox", { name: "Morgan · Shared" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("checkbox", { name: "Avery" })).toHaveProperty("disabled", false);
  expect(screen.getByRole("button", { name: "Share win with selected Crew" })).toHaveProperty("disabled", true);
});
