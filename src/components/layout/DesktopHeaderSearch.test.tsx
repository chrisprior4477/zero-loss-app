import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DesktopHeaderSearchFallback } from "./DesktopHeaderSearch";
import { searchExamples } from "@/lib/navigation/search-examples";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("header search submit cue", () => {
  test("names its all-prizes scope and submits the same unrestricted query as the catalog search", () => {
    const navigate = vi.fn();
    render(<DesktopHeaderSearchFallback navigate={navigate} />);
    const input = screen.getByRole("searchbox", { name: "Search all prizes" });
    expect(input.getAttribute("placeholder")).toBe("Search all prizes");
    fireEvent.change(input, { target: { value: "PlayStation" } });
    fireEvent.submit(input.closest("form")!);
    expect(navigate).toHaveBeenCalledWith("/browse?q=PlayStation#search-results");
  });
  test("changes the microphone to a visible Go button when a query is entered", () => {
    render(<DesktopHeaderSearchFallback />);
    expect(screen.getByRole("button", { name: "Start voice search" })).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "paper towels" } });
    expect(screen.getByRole("button", { name: "Go to search results" }).textContent).toBe("Go");
    expect(screen.queryByRole("button", { name: "Start voice search" })).toBeNull();
  });
});

test.each(searchExamples)("suggestion %s fills search without navigating until Go", example => {
  const navigate = vi.fn();
  render(<DesktopHeaderSearchFallback navigate={navigate} />);
  fireEvent.focus(screen.getByRole("searchbox"));
  expect(screen.getByRole("group", { name: "Try a search" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: example }));
  expect(screen.getByDisplayValue(example)).toBeTruthy();
  expect(navigate).not.toHaveBeenCalled();
  expect(screen.queryByRole("group", { name: "Try a search" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Go to search results" }));
  expect(navigate).toHaveBeenCalledWith(`/browse?q=${encodeURIComponent(example).replaceAll("%20", "+")}#search-results`);
});

test("outside tap and Escape close suggestions, while typing remains available", () => {
  render(<DesktopHeaderSearchFallback />);
  const input = screen.getByRole("searchbox");
  fireEvent.focus(input); fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("group", { name: "Try a search" })).toBeNull();
  fireEvent.click(input); fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("group", { name: "Try a search" })).toBeNull();
  fireEvent.change(input, { target: { value: "other search" } });
  expect(screen.getByDisplayValue("other search")).toBeTruthy();
});

test("Stop fills the search with the delayed transcript and waits for Go", async () => {
  class Speech {
    onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
    onerror = null; onend = null;
    start() {}
    stop() { queueMicrotask(() => this.onresult?.({ results: [[{ transcript: "Nintendo Switch" }]] })); }
    abort() {}
  }
  vi.stubGlobal("SpeechRecognition", Speech);
  const navigate = vi.fn();
  render(<DesktopHeaderSearchFallback navigate={navigate} />);
  fireEvent.click(screen.getByRole("button", { name: "Start voice search" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Stop voice search" })));
  expect(screen.getByRole("searchbox")).toHaveProperty("value", "Nintendo Switch");
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Go to search results" }));
  expect(navigate).toHaveBeenCalledExactlyOnceWith("/browse?q=Nintendo+Switch#search-results");
});

test("closing search cancels recognition and ignores a delayed result", () => {
  class Speech {
    static instances: Speech[] = [];
    onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
    onerror = null; onend = null;
    constructor() { Speech.instances.push(this); }
    start() {} stop() {} abort = vi.fn();
  }
  vi.stubGlobal("SpeechRecognition", Speech);
  const dismiss = vi.fn();
  render(<DesktopHeaderSearchFallback onDismiss={dismiss} />);
  fireEvent.click(screen.getByRole("button", { name: "Start voice search" }));
  const speech = Speech.instances[0];
  const lateResult = speech.onresult!;
  fireEvent.click(screen.getByRole("button", { name: "Close search" }));
  act(() => lateResult({ results: [[{ transcript: "Cancelled" }]] }));
  expect(dismiss).toHaveBeenCalledOnce();
  expect(speech.abort).toHaveBeenCalledOnce();
  expect(screen.getByRole("searchbox")).toHaveProperty("value", "");
});
