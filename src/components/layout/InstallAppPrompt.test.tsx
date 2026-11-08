import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { INSTALL_APP_REQUEST_EVENT, InstallAppPrompt } from "./InstallAppPrompt";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("blocked storage reads still allow the install instructions to initialize", async () => {
  vi.useFakeTimers();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  render(<InstallAppPrompt />);
  act(() => { vi.runOnlyPendingTimers(); });
  fireEvent(window, new Event(INSTALL_APP_REQUEST_EVENT));
  expect(screen.getByLabelText("Install Zero Loss")).toBeTruthy();
});

test("closing before initialization stays closed even when storage reads and writes fail", () => {
  vi.useFakeTimers();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  render(<InstallAppPrompt />);
  fireEvent(window, new Event(INSTALL_APP_REQUEST_EVENT));
  fireEvent.click(screen.getByRole("button", { name: "Dismiss install suggestion" }));
  act(() => { vi.runOnlyPendingTimers(); });
  expect(screen.queryByLabelText("Install Zero Loss")).toBeNull();
  fireEvent(window, new Event(INSTALL_APP_REQUEST_EVENT));
  expect(screen.getByLabelText("Install Zero Loss")).toBeTruthy();
});

test.each(["Dismiss install suggestion", "Not now"])("%s closes the suggestion when remembering it is blocked", name => {
  vi.useFakeTimers();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
  render(<InstallAppPrompt />);
  act(() => { vi.runOnlyPendingTimers(); });
  const prompt = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(prompt, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: "dismissed" }) });
  fireEvent(window, prompt);
  fireEvent.pointerDown(window);
  fireEvent.click(screen.getByRole("button", { name }));
  expect(screen.queryByLabelText("Install Zero Loss")).toBeNull();
});

test("declining the native installation still dismisses guidance when storage is blocked", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  render(<InstallAppPrompt />);
  const prompt = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(prompt, { prompt: vi.fn(async () => {}), userChoice: Promise.resolve({ outcome: "dismissed" }) });
  fireEvent(window, prompt);
  await act(async () => { fireEvent(window, new Event(INSTALL_APP_REQUEST_EVENT)); });
  expect(screen.queryByLabelText("Install Zero Loss")).toBeNull();
});

test("an explicit menu request always offers device-appropriate install guidance", async () => {
  render(<InstallAppPrompt />);
  fireEvent(window, new Event(INSTALL_APP_REQUEST_EVENT));
  expect(await screen.findByLabelText("Install Zero Loss")).toBeTruthy();
  expect(screen.getByText(/Open your browser menu and choose Install Zero Loss or Add to Home Screen/)).toBeTruthy();
});
