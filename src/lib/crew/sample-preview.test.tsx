import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { addSampleCrewPreview, featuredCrewPeople, initializeSampleCrewPreview, removeSampleCrewPreview, useSampleCrewPreviews } from "./sample-preview";

function Probe({ label = "Selected" }: { label?: string }) {
  const names = useSampleCrewPreviews();
  return <><output aria-label={label}>{names.join(",")}</output><button onClick={() => addSampleCrewPreview("Maya")}>Add Maya</button></>;
}
beforeEach(() => { localStorage.clear(); });
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  // A successful write releases the temporary browser-only fallback.
  removeSampleCrewPreview("Maya"); localStorage.clear();
});

test("blocked writes update every subscriber and survive a component remount", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  const view = render(<><Probe label="Homepage" /><Probe label="Account" /></>);
  fireEvent.click(screen.getAllByRole("button", { name: "Add Maya" })[0]);
  expect(screen.getByLabelText("Homepage").textContent).toBe("Maya");
  expect(screen.getByLabelText("Account").textContent).toBe("Maya");
  view.unmount(); render(<Probe />);
  expect(screen.getByLabelText("Selected").textContent).toBe("Maya");
  act(() => removeSampleCrewPreview("Maya"));
  expect(screen.getByLabelText("Selected").textContent).toBe("");
});

test("blocked reads and writes still permit adding and removing sample people", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  render(<Probe />);
  fireEvent.click(screen.getByRole("button", { name: "Add Maya" }));
  act(() => { addSampleCrewPreview("Daniel"); addSampleCrewPreview("Maya"); });
  expect(screen.getByLabelText("Selected").textContent).toBe("Maya,Daniel");
  act(() => removeSampleCrewPreview("Maya"));
  expect(screen.getByLabelText("Selected").textContent).toBe("Daniel");
});

test("default preview initialization works with blocked storage without overwriting later choices", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  initializeSampleCrewPreview(); render(<Probe />);
  expect(screen.getByLabelText("Selected").textContent).toBe(featuredCrewPeople.map(person => person.name).join(","));
  act(() => { removeSampleCrewPreview("Maya"); initializeSampleCrewPreview(); });
  expect(screen.getByLabelText("Selected").textContent).not.toContain("Maya");
});

test("saving resumes with the temporary selections when storage becomes available again", () => {
  const writes = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
  addSampleCrewPreview("Maya"); writes.mockRestore();
  addSampleCrewPreview("Daniel");
  expect(JSON.parse(localStorage.getItem("zero-loss-sample-crew-v1")!)).toEqual(["Maya", "Daniel"]);
  render(<Probe />);
  expect(screen.getByLabelText("Selected").textContent).toBe("Maya,Daniel");
});
