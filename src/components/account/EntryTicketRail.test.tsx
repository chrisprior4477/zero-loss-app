import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { EntryTicketRail, type SavedTicket } from "./EntryTicketRail";
import { entryTicketReturnKey } from "@/lib/account/entry-ticket-return";

const tickets: SavedTicket[] = Array.from({ length: 6 }, (_, index) => ({
  entryId: `ent_${index + 1}`, number: index + 1, title: "Gift card", image: "/card.png",
  enteredAt: null, enteredLabel: "Today", amountLabel: "$1",
}));
const props = { ownerId: "owner-1", title: "Gift card", selectedEntryId: tickets[0].entryId };

beforeEach(() => {
  window.history.replaceState({ frameworkState: "keep" }, "", "/account/entries/ent_1");
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
});

test("refresh restores the selected ticket and expanded list while preserving router state", () => {
  const view = render(<EntryTicketRail {...props} tickets={tickets} />);
  fireEvent.click(screen.getByRole("button", { name: "View entry 4 of 6" }));
  fireEvent.click(screen.getByRole("button", { name: "See all 6 entries" }));
  expect(window.history.state.frameworkState).toBe("keep");
  expect(window.location.pathname).toBe("/account/entries/ent_1");
  expect(window.history.state[entryTicketReturnKey]).toMatchObject({ selectedEntryId: "ent_4", showAll: true });
  view.unmount();
  render(<EntryTicketRail {...props} tickets={tickets} />);
  expect(screen.getByRole("article", { name: "Entry 4 of 6" })).toBeTruthy();
  expect(screen.getByRole("group", { name: "All 6 saved entries" })).toBeTruthy();
});

test("Back restores the outgoing selection without replacing the destination's ticket", () => {
  const view = render(<EntryTicketRail {...props} tickets={tickets} />);
  fireEvent.click(screen.getByRole("button", { name: "View entry 4 of 6" }));
  const outgoing = window.history.state;
  view.unmount();
  window.history.replaceState({}, "", "/account/entries/ent_4?entries=open");
  const destination = render(<EntryTicketRail {...props} selectedEntryId="ent_4" tickets={tickets} />);
  expect(screen.getByRole("article", { name: "Entry 4 of 6" })).toBeTruthy();
  destination.unmount();
  window.history.replaceState(outgoing, "", "/account/entries/ent_1");
  render(<EntryTicketRail {...props} tickets={tickets} />);
  expect(screen.getByRole("article", { name: "Entry 4 of 6" })).toBeTruthy();
});

test("ignores a bookmark for another account, page, initial ticket or removed ticket", () => {
  const saved = { ownerId: props.ownerId, href: "/account/entries/ent_1", initialEntryId: "ent_1", selectedEntryId: "ent_4", showAll: true };
  for (const change of [{ ownerId: "another-owner" }, { href: "/account/entries/another" }, { initialEntryId: "ent_2" }, { selectedEntryId: "removed" }]) {
    window.history.replaceState({ [entryTicketReturnKey]: { ...saved, ...change } }, "");
    const view = render(<EntryTicketRail {...props} tickets={tickets} />);
    expect(screen.getByRole("article", { name: "Entry 1 of 6" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "All 6 saved entries" })).toBeNull();
    view.unmount();
  }
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

test("scrolls to the updated rail after two and then three confirmed entries appear", () => {
  const view = render(<EntryTicketRail {...props} tickets={tickets.slice(0, 1)} />);
  const rail = screen.getByRole("region", { name: "Your separate entries for Gift card" });
  const scroll = vi.fn(); rail.scrollIntoView = scroll;
  act(() => vi.runAllTimers());
  expect(scroll).not.toHaveBeenCalled();

  for (const count of [3, 6]) {
    view.rerender(<EntryTicketRail {...props} tickets={tickets.slice(0, count)} />);
    expect(screen.getByRole("heading", { name: `Your ${count} separate entries` })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /View entry/ })).toHaveLength(count);
    act(() => vi.runAllTimers());
    expect(scroll).toHaveBeenLastCalledWith({ block: "start", behavior: "auto" });
  }
  expect(scroll).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("article", { name: "Entry 1 of 6" })).toBeTruthy();
});

test("refreshes without new entries and nearby ticket selection do not move the page", () => {
  const view = render(<EntryTicketRail {...props} tickets={tickets.slice(0, 3)} />);
  const scroll = vi.fn(); screen.getByRole("region").scrollIntoView = scroll;
  view.rerender(<EntryTicketRail {...props} tickets={tickets.slice(0, 3)} />);
  fireEvent.click(screen.getByRole("button", { name: "View entry 2 of 3" }));
  view.rerender(<EntryTicketRail {...props} tickets={tickets.slice(0, 2)} />);
  act(() => vi.runAllTimers());
  expect(scroll).not.toHaveBeenCalled();
});

test("cancels a scheduled scroll when navigating away", () => {
  const view = render(<EntryTicketRail {...props} tickets={tickets.slice(0, 1)} />);
  const scroll = vi.fn(); screen.getByRole("region").scrollIntoView = scroll;
  view.rerender(<EntryTicketRail {...props} tickets={tickets.slice(0, 3)} />);
  view.unmount();
  act(() => vi.runAllTimers());
  expect(scroll).not.toHaveBeenCalled();
});

test("the nine-ticket window follows the wheel and clamps correctly at both ends", () => {
  const many = Array.from({ length: 51 }, (_, index) => ({ ...tickets[0], entryId: `ent_${index + 1}`, number: index + 1 }));
  render(<EntryTicketRail {...props} tickets={many} selectedEntryId="ent_26" />);
  const nearby = screen.getByRole("group", { name: "Nearby entry tickets" });
  expect(within(nearby).getAllByRole("button")).toHaveLength(9);
  expect(within(nearby).getByRole("button", { name: "View entry 22 of 51" })).toBeTruthy();
  expect(within(nearby).getByRole("button", { name: "View entry 30 of 51" })).toBeTruthy();
  const wheel = screen.getByRole("listbox", { name: "View entry" });
  fireEvent.keyDown(wheel, { key: "End" });
  expect(screen.getByRole("article", { name: "Entry 51 of 51" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next entry" }).hasAttribute("disabled")).toBe(true);
  expect(within(nearby).getByRole("button", { name: "View entry 43 of 51" })).toBeTruthy();
  fireEvent.keyDown(wheel, { key: "Home" });
  expect(screen.getByRole("article", { name: "Entry 1 of 51" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Previous entry" }).hasAttribute("disabled")).toBe(true);
  expect(within(nearby).getByRole("button", { name: "View entry 9 of 51" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Next entry" }));
  expect(screen.getByRole("article", { name: "Entry 2 of 51" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "2" }).getAttribute("aria-selected")).toBe("true");
  Object.defineProperty(wheel, "clientHeight", { configurable: true, value: 132 });
  wheel.scrollTop = 36 * 44;
  fireEvent.scroll(wheel);
  expect(screen.getByRole("article", { name: "Entry 37 of 51" })).toBeTruthy();
  expect(within(nearby).getByRole("button", { name: "View entry 37 of 51" }).getAttribute("aria-pressed")).toBe("true");
});

test("all entries expands without a cap and selecting a ticket keeps its ID and link", async () => {
  const many = Array.from({ length: 125 }, (_, index) => ({ ...tickets[0], entryId: `ent_${index + 1}`, number: index + 1 }));
  render(<EntryTicketRail {...props} tickets={many} />);
  expect(screen.queryByRole("group", { name: "All 125 saved entries" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "See all 125 entries" }));
  const all = screen.getByRole("group", { name: "All 125 saved entries" });
  expect(within(all).getAllByRole("button")).toHaveLength(125);
  screen.getByRole("article").scrollIntoView = vi.fn();
  fireEvent.click(within(all).getByRole("button", { name: "View entry 125 of 125" }));
  const entry = screen.getByRole("article", { name: "Entry 125 of 125" });
  expect(within(entry).getByRole("img", { name: "Gift card" })).toBeTruthy();
  expect(within(entry).getByText("Entry #ent_125")).toBeTruthy();
  expect(within(entry).getByRole("link", { name: "View this entry" }).getAttribute("href")).toBe("/account/entries/ent_125?entries=open#saved-entry-rail");
  const copy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: copy } });
  await act(async () => fireEvent.click(within(entry).getByRole("button", { name: "Copy full entry number ent_125" })));
  expect(copy).toHaveBeenCalledWith("ent_125");
  const expand = screen.getByRole("button", { name: "Hide all 125 entries" });
  expand.scrollIntoView = vi.fn();
  fireEvent.click(screen.getByRole("button", { name: "Hide all entries" }));
  expect(screen.queryByRole("group", { name: "All 125 saved entries" })).toBeNull();
  expect(screen.getByRole("article", { name: "Entry 125 of 125" })).toBeTruthy();
  expect(document.activeElement).toBe(expand);
});

test("a single entry and an entry removed on refresh remain usable", () => {
  const view = render(<EntryTicketRail {...props} tickets={tickets.slice(0, 1)} />);
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(screen.queryByRole("button", { name: /See all/ })).toBeNull();
  expect(screen.getByRole("article", { name: "Entry 1 of 1" })).toBeTruthy();
  view.rerender(<EntryTicketRail {...props} tickets={tickets.slice(0, 3)} />);
  fireEvent.click(screen.getByRole("button", { name: "View entry 3 of 3" }));
  view.rerender(<EntryTicketRail {...props} tickets={tickets.slice(0, 2)} />);
  expect(screen.getByRole("article", { name: "Entry 1 of 2" })).toBeTruthy();
  view.unmount();
});
