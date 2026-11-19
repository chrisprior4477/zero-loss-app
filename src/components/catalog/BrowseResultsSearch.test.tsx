import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BrowseResultsSearch, BrowseResultsSearchSession } from "./BrowseResultsSearch";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test.each(["top", "bottom"] as const)("Escape restores the %s search and keeps keyboard focus in the form", position => {
  render(<BrowseResultsSearchSession browseHref="/browse?sort=ending-soon" searchTerm="Walmart" endingSoon>
    <BrowseResultsSearch position={position} />
  </BrowseResultsSearchSession>);
  const input = screen.getByRole("searchbox");
  act(() => input.focus());
  fireEvent.change(input, { target: { value: "Target" } });
  const close = screen.getByRole("button", { name: "Close search" });
  close.focus();
  expect(fireEvent.keyDown(close, { key: "Escape" })).toBe(false);
  expect(screen.queryByRole("button", { name: "Close search" })).toBeNull();
  expect(input).toHaveProperty("value", "Walmart");
  expect(document.activeElement).toBe(input);
  fireEvent.change(input, { target: { value: "Best Buy" } });
  expect(screen.getByRole("button", { name: "Close search" })).toBeTruthy();
});

test.each(["top", "bottom"] as const)("editing the %s Ending Soon search supersedes a stopped transcript in both fields", position => {
  class Speech {
    static last: Speech;
    onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
    onerror = null; onend = null;
    constructor() { Speech.last = this; }
    start() {} stop() {} abort = vi.fn();
  }
  vi.stubGlobal("SpeechRecognition", Speech);
  render(<BrowseResultsSearchSession browseHref="/browse?sort=ending-soon" searchTerm="" endingSoon>
    <BrowseResultsSearch position="top" /><BrowseResultsSearch position="bottom" />
  </BrowseResultsSearchSession>);
  const form = within(screen.getByRole("search", { name: `Search Ending Soon at the ${position}` }));
  fireEvent.focus(form.getByRole("searchbox"));
  fireEvent.click(form.getByRole("button", { name: "Start voice search" }));
  const late = Speech.last.onresult!;
  fireEvent.click(form.getByRole("button", { name: "Stop voice search" }));
  fireEvent.change(form.getByRole("searchbox"), { target: { value: "Walmart $100" } });
  act(() => late({ results: [[{ transcript: "Old spoken search" }]] }));
  screen.getAllByRole("searchbox").forEach(input => expect(input).toHaveProperty("value", "Walmart $100"));
  expect(Speech.last.abort).toHaveBeenCalledOnce();
});
