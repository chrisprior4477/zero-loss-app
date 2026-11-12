import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CrewDiscoveryPanel } from "./CrewDiscoveryDialog";

const actions = vi.hoisted(() => ({ searchCrewByName: vi.fn(), inviteToCrew: vi.fn(), inviteToCrewByPhone: vi.fn(), inviteToCrewById: vi.fn() }));
vi.mock("@/lib/crew/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); });
afterEach(cleanup);

function openFinder() {
  render(<CrewDiscoveryPanel onClose={vi.fn()} outerPanelRef={{ current: null }} />);
  return screen.getByRole("searchbox", { name: "Search by name" });
}
function search(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Search Crew by name" }));
}
const oldResult = { ok: true, message: "Old result", people: [{ memberId: "old-person", name: "Christopher", avatarUrl: null }] };

test.each(["resolve", "reject"])("Show all sample profiles ignores an old search that later %ss", async outcome => {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  actions.searchCrewByName.mockImplementation(() => new Promise((done, fail) => { resolve = done; reject = fail; }));
  const input = openFinder();
  search(input, "Chris");
  fireEvent.click(screen.getByRole("button", { name: "Show all sample profiles" }));
  await act(async () => { if (outcome === "resolve") resolve(oldResult); else reject(new Error("Offline")); });
  expect(input).toHaveProperty("value", "");
  expect(screen.queryByText("Christopher")).toBeNull();
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("button", { name: "Search Crew by name" })).toHaveProperty("disabled", false);
});

test("changing to a short name clears results and explains the minimum on submit", async () => {
  actions.searchCrewByName.mockResolvedValue(oldResult);
  const input = openFinder();
  search(input, "Chris");
  await screen.findByText("Christopher");
  fireEvent.change(input, { target: { value: "Al" } });
  expect(screen.queryByText("Christopher")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Search Crew by name" }));
  expect(screen.getByRole("status").textContent).toBe("Enter at least 3 letters to search by name.");
  expect(actions.searchCrewByName).toHaveBeenCalledTimes(1);
});

test("a new homepage search wins over an older response arriving late", async () => {
  let resolve!: (value: unknown) => void;
  actions.searchCrewByName.mockImplementationOnce(() => new Promise(done => { resolve = done; }))
    .mockResolvedValue({ ok: true, message: "New result", people: [{ memberId: "new-person", name: "Alexandra", avatarUrl: null }] });
  const input = openFinder();
  search(input, "Chris");
  expect(input).toHaveProperty("disabled", false);
  search(input, "Alex");
  await screen.findByText("Alexandra");
  await act(async () => resolve(oldResult));
  expect(screen.queryByText("Christopher")).toBeNull();
  expect(screen.getByText("Alexandra")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe("New result");
  expect(actions.inviteToCrewById).not.toHaveBeenCalled();
});
