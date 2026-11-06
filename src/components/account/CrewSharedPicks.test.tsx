import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CrewSharedPicks } from "./CrewSharedPicks";
import { defaultCrewVisibilityRule } from "@/lib/crew/visibility";
import type { OwnCrewEntry } from "@/app/account/crew/page";

const actions = vi.hoisted(() => ({ cleanupCrewShares: vi.fn(), undoCrewShareCleanup: vi.fn(), shareOwnedCrewEntry: vi.fn() }));
vi.mock("@/lib/crew/sharing-actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
const family = "10000000-0000-4000-8000-000000000001";
const football = "10000000-0000-4000-8000-000000000002";
const groups = [{ id: family, name: "Family", memberIds: [] }, { id: football, name: "Football", memberIds: [] }];
const entries: OwnCrewEntry[] = Array.from({ length: 44 }, (_, i) => ({ id: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}`, offeringSlug: i < 42 ? "playstation-5-slim" : "samsung-tv", title: i < 42 ? "PlayStation 5" : "Samsung TV", retailer: "Best Buy", image: null, createdAt: "2026-01-01T12:00:00Z", sharedAt: i === 0 ? new Date().toISOString() : "2026-01-01T12:00:00Z", shared: true }));
const base = { entries, groups, rules: {}, defaultRule: defaultCrewVisibilityRule, available: true, onPrivacy: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  actions.cleanupCrewShares.mockResolvedValue({ ok: true, count: 42, undoId: "undo-id", message: "Stopped sharing 42 entries." });
  actions.undoCrewShareCleanup.mockResolvedValue({ ok: true, message: "Cleanup undone." });
});
afterEach(cleanup);

test("groups repeats and keeps an older prize accessible beyond 40 entries", () => {
  const { container } = render(<CrewSharedPicks {...base} />);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
  expect(screen.getByRole("heading", { name: "Samsung TV" })).toBeTruthy();
  expect(container.querySelectorAll('[data-stacked="true"]')).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "View entries 42" }));
  expect(screen.getByText("Entry 1", { exact: true })).toBeTruthy();
  expect(screen.queryByText("Entry 6", { exact: true })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show more entries · 37 remaining" }));
  expect(screen.getByText("Entry 6", { exact: true })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Stop Sharing All" })).toBeTruthy();
});
test("trash immediately clears only the selected prize and group, with Undo", async () => {
  render(<CrewSharedPicks {...base} defaultRule={{ audience: "groups", memberIds: [], groupIds: [family, football] }} />);
  fireEvent.change(screen.getByLabelText("Shared with", { selector: "select" }), { target: { value: football } });
  fireEvent.click(screen.getByRole("button", { name: "Stop sharing all PlayStation 5 entries with Football" }));
  await waitFor(() => expect(actions.cleanupCrewShares).toHaveBeenCalledWith(expect.any(String), { scope: football, offeringSlug: "playstation-5-slim" }));
  fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(actions.undoCrewShareCleanup).toHaveBeenCalledWith("undo-id"));
});
test("age cleanup requires review and does not include a recently shared entry", async () => {
  render(<CrewSharedPicks {...base} />);
  fireEvent.click(screen.getByRole("button", { name: "Clean up sharing" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("43 entries match.")).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Review cleanup" }));
  expect(actions.cleanupCrewShares).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Stop sharing 43 entries" }));
  await waitFor(() => expect(actions.cleanupCrewShares).toHaveBeenCalledWith(expect.any(String), { scope: "crew", before: expect.any(String) }));
});
test("uncertain cleanup retries the same operation instead of starting another", async () => {
  actions.cleanupCrewShares.mockRejectedValueOnce(new Error("offline"));
  render(<CrewSharedPicks {...base} />);
  fireEvent.click(screen.getByRole("button", { name: "Stop sharing all Samsung TV entries with Your Crew" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry cleanup" }));
  await waitFor(() => expect(actions.cleanupCrewShares).toHaveBeenCalledTimes(2));
  expect(actions.cleanupCrewShares.mock.calls[0]).toEqual(actions.cleanupCrewShares.mock.calls[1]);
});

test("one audience picker opens the populated group and switches back to Crew on mobile", () => {
  render(<CrewSharedPicks {...base} defaultRule={{ audience: "groups", memberIds: [], groupIds: [football] }} />);
  expect(screen.getByRole("heading", { name: "My Shared Picks Cleanup" })).toBeTruthy();
  expect((screen.getByLabelText("Shared with", { selector: "select" }) as HTMLSelectElement).value).toBe(football);
  fireEvent.click(screen.getByRole("button", { name: "Shared with Football" }));
  const dialog = screen.getByRole("dialog", { name: "Shared with" });
  fireEvent.click(within(dialog).getByRole("button", { name: /Your Crew/ }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect((screen.getByLabelText("Shared with", { selector: "select" }) as HTMLSelectElement).value).toBe("crew");
  expect(screen.queryByRole("button", { name: /Stop sharing all/ })).toBeNull();
});
