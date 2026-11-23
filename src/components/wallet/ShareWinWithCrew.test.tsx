import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ShareWinWithCrew } from "./ShareWinWithCrew";
import { getOwnWinShareRecipients, shareWinWithCrew } from "@/lib/crew/actions";

vi.mock("@/lib/crew/actions", () => ({ getOwnWinShareRecipients: vi.fn(), shareWinWithCrew: vi.fn() }));
afterEach(cleanup);

test.each([false, true])("verified recipients override an uncertain share response, partial=%s", async partial => {
  vi.mocked(shareWinWithCrew).mockResolvedValueOnce({ ok: false, message: "Original error" });
  vi.mocked(getOwnWinShareRecipients).mockResolvedValueOnce(partial ? ["one"] : ["one", "two"]);
  render(<ShareWinWithCrew rewardId="reward-1" members={[{ id: "one", name: "Avery" }, { id: "two", name: "Morgan" }]} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Avery" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Morgan" }));
  fireEvent.click(screen.getByRole("button", { name: "Share win with selected Crew" }));
  expect(await screen.findByRole("checkbox", { name: "Avery · Shared" })).toHaveProperty("disabled", true);
  if (partial) {
    expect(screen.getByRole("alert").textContent).toMatch(/Some shares were confirmed/);
    expect(screen.getByRole("checkbox", { name: "Morgan" })).toHaveProperty("checked", true);
  } else {
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Morgan · Shared" })).toHaveProperty("disabled", true);
  }
});

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
