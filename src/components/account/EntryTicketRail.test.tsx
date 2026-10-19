import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { EntryTicketRail, type SavedTicket } from "./EntryTicketRail";

const tickets: SavedTicket[] = Array.from({ length: 6 }, (_, index) => ({
  entryId: `ent_${index + 1}`, number: index + 1, title: "Gift card", image: "/card.png",
  enteredAt: null, enteredLabel: "Today", amountLabel: "$1",
}));
const props = { title: "Gift card", selectedEntryId: tickets[0].entryId, initiallyExpanded: true };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
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
    expect(screen.getAllByRole("button", { name: /(?:Hide|Show) entry/ })).toHaveLength(count);
    act(() => vi.runAllTimers());
    expect(scroll).toHaveBeenLastCalledWith({ block: "start", behavior: "auto" });
  }
  expect(scroll).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("article", { name: "Entry 1 of 6" })).toBeTruthy();
});

test("refreshes without new entries and toggling tickets do not move the page", () => {
  const view = render(<EntryTicketRail {...props} tickets={tickets.slice(0, 3)} />);
  const scroll = vi.fn(); screen.getByRole("region").scrollIntoView = scroll;
  view.rerender(<EntryTicketRail {...props} tickets={tickets.slice(0, 3)} />);
  fireEvent.click(screen.getByRole("button", { name: "Show entry 2 of 3" }));
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

test("numbered tickets retain the approved count badge proportions with separated circular scoops", () => {
  const css = readFileSync("src/components/account/entry-page.module.css", "utf8");
  const rule = css.match(/\.entryRailSmallTicket \{([^}]+)\}/)![1];
  const value = (name: string) => Number(rule.match(new RegExp(`${name}: ([\\d.]+)px`))![1]);
  const height = value("height");
  expect(value("width") / height).toBeCloseTo(39 / 30);
  expect(value("--ticket-corner-notch") / height).toBeCloseTo(6 / 30);
  expect(value("--ticket-side-notch") / height).toBeCloseTo(4 / 30);
  expect(height / 2 - value("--ticket-corner-notch") - value("--ticket-side-notch")).toBeGreaterThan(6);
  expect(css).toContain("mask-composite: intersect");
});
