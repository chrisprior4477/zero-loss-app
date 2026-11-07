import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useVoiceSearch } from "./useVoiceSearch";

class Speech {
  static instances: Speech[] = [];
  lang = ""; continuous = false; interimResults = false;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() { Speech.instances.push(this); }
  result(text: string) { this.onresult?.({ results: [[{ transcript: text }]] }); }
}

function Voice({ onTranscript }: { onTranscript: (text: string) => void }) {
  const voice = useVoiceSearch(onTranscript);
  return <><button onClick={voice.toggle}>{voice.listening ? "Stop" : "Start"}</button>
    <button onClick={voice.cancel}>Cancel</button><p role="status">{voice.error}</p></>;
}
beforeEach(() => { Speech.instances = []; vi.stubGlobal("SpeechRecognition", Speech); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("Stop accepts the browser's delayed final result exactly once", async () => {
  const onTranscript = vi.fn();
  render(<Voice onTranscript={onTranscript} />);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  const speech = Speech.instances[0];
  speech.stop.mockImplementation(() => queueMicrotask(() => speech.result(" PlayStation ")));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Stop" })));
  expect(speech.stop).toHaveBeenCalledOnce();
  expect(onTranscript).toHaveBeenCalledExactlyOnceWith("PlayStation");
  speech.result("Duplicate");
  expect(onTranscript).toHaveBeenCalledOnce();
  expect(speech.onend).toBeNull();
});

test("natural completion accepts a result and a no-result end permits another search", () => {
  const onTranscript = vi.fn();
  render(<Voice onTranscript={onTranscript} />);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  act(() => Speech.instances[0].onend?.());
  expect(onTranscript).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  act(() => Speech.instances[1].result("Gift card"));
  expect(onTranscript).toHaveBeenCalledExactlyOnceWith("Gift card");
  expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
});

test("cancel and unmount abort without letting a late result change the search", () => {
  const onTranscript = vi.fn();
  const view = render(<Voice onTranscript={onTranscript} />);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  const first = Speech.instances[0]; const lateResult = first.onresult!;
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  act(() => lateResult({ results: [[{ transcript: "Cancelled" }]] }));
  expect(first.abort).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  const second = Speech.instances[1];
  view.unmount();
  second.result("After unmount");
  expect(second.abort).toHaveBeenCalledOnce();
  expect(onTranscript).not.toHaveBeenCalled();
});

test("starting again supersedes the old pending final result and end event", () => {
  const onTranscript = vi.fn();
  render(<Voice onTranscript={onTranscript} />);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  const first = Speech.instances[0]; const staleEnd = first.onend!; const staleResult = first.onresult!;
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  act(() => { staleResult({ results: [[{ transcript: "Old" }]] }); staleEnd(); });
  expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
  act(() => Speech.instances[1].result("New"));
  expect(onTranscript).toHaveBeenCalledExactlyOnceWith("New");
});

test("permission failure ends listening with an explanation", () => {
  render(<Voice onTranscript={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  act(() => Speech.instances[0].onerror?.({ error: "not-allowed" }));
  expect(screen.getByRole("status").textContent).toContain("Allow microphone access");
  expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
});
