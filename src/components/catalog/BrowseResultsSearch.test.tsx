import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BrowseResultsSearch, BrowseResultsSearchSession, returnBrowseSearchDraft } from "./BrowseResultsSearch";
import { BrowseProductRequestLink } from "./BrowsePrizeLink";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("uses the current Browse draft for a product request and restores it over the applied query on return", async () => {
  const source = "/browse?q=Walmart&maxValue=75";
  const originalUrl = location.href;
  const originalState = history.state;
  try {
    history.replaceState(null, "", source);
    const request = "/contact/product-request?" + new URLSearchParams({ product: "Walmart", from: source }) + "#product-request";
    const page = <BrowseResultsSearchSession browseHref={source} searchTerm="Walmart">
      <BrowseResultsSearch position="top" />
      <BrowseProductRequestLink href={request} className="request" />
    </BrowseResultsSearchSession>;
    const { unmount } = render(page);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Walmart garden lights" } });
    const href = new URL(screen.getByRole("link", { name: /request a product/i }).getAttribute("href")!, location.origin);
    expect(href.searchParams.get("product")).toBe("Walmart garden lights");
    expect(href.searchParams.get("from")).toBe(source);
    unmount();

    history.replaceState(null, "", source);
    returnBrowseSearchDraft("/browse?maxValue=75&q=Walmart#search-results", "Walmart garden lights");
    render(page);
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveProperty("value", "Walmart garden lights"));
    expect(location.search).toBe("?q=Walmart&maxValue=75");
  } finally {
    history.replaceState(originalState, "", originalUrl);
  }
});

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
