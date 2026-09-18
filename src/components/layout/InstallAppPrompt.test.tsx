import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { INSTALL_APP_REQUEST_EVENT, InstallAppPrompt } from "./InstallAppPrompt";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("an explicit menu request always offers device-appropriate install guidance", async () => {
  render(<InstallAppPrompt />);
  fireEvent(window, new Event(INSTALL_APP_REQUEST_EVENT));
  expect(await screen.findByLabelText("Install Zero Loss")).toBeTruthy();
  expect(screen.getByText(/Open your browser menu and choose Install Zero Loss or Add to Home Screen/)).toBeTruthy();
});
