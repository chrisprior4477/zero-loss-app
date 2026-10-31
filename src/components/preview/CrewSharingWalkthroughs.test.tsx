import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CrewSharingWalkthroughs } from "./CrewSharingWalkthroughs";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test("adding by phone clears search, shows the named receipt, and appears in Crew", () => {
  render(<CrewSharingWalkthroughs initialJourney="add" />);
  fireEvent.click(screen.getByRole("button", { name: "Find & add someone" }));
  const query = screen.getByLabelText("Name, email, or phone number") as HTMLInputElement;
  fireEvent.change(query, { target: { value: "(111) 111-1111" } });
  expect(screen.getByText("testcustomer1@example.test")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add Test Customer 1" }));
  expect(query.value).toBe("");
  expect(query.placeholder).toBe("Add another person…");
  expect(screen.getByRole("status").textContent).toContain("Test Customer 1 added to your Crew.");
  expect(query.closest("label")?.nextElementSibling).toBe(screen.getByRole("status"));
  expect((screen.getByRole("button", { name: "Already added Test Customer 1" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Add Test Customer 4" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See your Crew →" }));
  expect(screen.getByText("Test Customer 1")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to where I was" }));
  fireEvent.click(screen.getByRole("button", { name: "Done · back to sharing" }));
  expect(screen.getByText("3 people in your Crew")).toBeTruthy();
});

test("adding another suggestion keeps the people list available without retyping", () => {
  render(<CrewSharingWalkthroughs initialJourney="add" />);
  fireEvent.click(screen.getByRole("button", { name: "Find & add someone" }));
  fireEvent.click(screen.getByRole("button", { name: "Add Test Customer 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Add Test Customer 4" }));
  expect(screen.getByRole("status").textContent).toContain("Test Customer 4 added");
  expect((screen.getByRole("button", { name: "Already added Test Customer 1" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Already added Test Customer 4" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("4 in your Crew")).toBeTruthy();
});

test("popup height never exceeds the layout viewport and responds to keyboard resize", () => {
  const viewport = { height: window.innerHeight + 300, offsetTop: 200, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("visualViewport", viewport);
  render(<CrewSharingWalkthroughs initialJourney="text" />);
  const dialog = screen.getByRole("dialog");
  expect(dialog.style.getPropertyValue("--visible-height")).toBe(`${window.innerHeight}px`);
  viewport.height = 360;
  fireEvent(window, new Event("resize"));
  expect(dialog.style.getPropertyValue("--visible-height")).toBe("360px");
  expect(dialog.style.getPropertyValue("--visible-top")).toBe("");
});

test("adding from an empty group preserves that audience and enables its send button", () => {
  render(<CrewSharingWalkthroughs initialJourney="group" />);
  fireEvent.click(screen.getByRole("button", { name: "Share with group(s)" }));
  fireEvent.click(screen.getByRole("button", { name: "Add people to Test" }));
  fireEvent.change(screen.getByLabelText("Add to your Crew and this group"), { target: { value: "Test Customer 1" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Test Customer 1" }));
  expect(screen.getByRole("status").textContent).toContain("your Crew and Test");
  fireEvent.click(screen.getByRole("button", { name: "Done · back to Test" }));
  expect((screen.getByRole("button", { name: "Send to Test" }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole("radio", { name: /Test/ }) as HTMLInputElement).checked).toBe(true);
});

test("a new group searches people, saves their membership, and returns selected", () => {
  render(<CrewSharingWalkthroughs initialJourney="group" />);
  fireEvent.click(screen.getByRole("button", { name: "Share with group(s)" }));
  fireEvent.click(screen.getByRole("button", { name: "＋ Create group" }));
  fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Movie night" } });
  fireEvent.change(screen.getByLabelText("Find people"), { target: { value: "testcustomer5@example.test" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /Test Customer 5/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  expect(screen.getByRole("button", { name: "Send to Movie night" })).toBeTruthy();
  expect((screen.getByRole("radio", { name: /Movie night/ }) as HTMLInputElement).checked).toBe(true);
});

test("cancelling group edits does not add a group or connect staged people", () => {
  render(<CrewSharingWalkthroughs initialJourney="group" />);
  fireEvent.click(screen.getByRole("button", { name: "Share with group(s)" }));
  fireEvent.click(screen.getByRole("button", { name: "＋ Create group" }));
  fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Unsaved" } });
  fireEvent.change(screen.getByLabelText("Find people"), { target: { value: "Test Customer 5" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /Test Customer 5/ }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByText("Unsaved")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "← Back" }));
  fireEvent.click(screen.getByRole("button", { name: "Share with Crew" }));
  expect(screen.getByText("2 people in your Crew")).toBeTruthy();
});

test("Crew confirmation automatically returns to entry details without a live send", () => {
  vi.useFakeTimers();
  render(<CrewSharingWalkthroughs initialJourney="crew" />);
  fireEvent.click(screen.getByRole("button", { name: "Share with Crew" }));
  fireEvent.click(screen.getByRole("button", { name: "Send to my Crew" }));
  expect(screen.getByRole("heading", { name: "Shared in this walkthrough" })).toBeTruthy();
  act(() => { vi.advanceTimersByTime(2700); });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("with 2 Crew members");
  expect(screen.getByText("Nothing was sent and your real account is unchanged.")).toBeTruthy();
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
});

test("the text journey reaches a complete simulated draft and returns to the item", () => {
  render(<CrewSharingWalkthroughs initialJourney="text" />);
  fireEvent.click(screen.getByRole("button", { name: "Text" }));
  fireEvent.change(screen.getByLabelText("Phone number · optional"), { target: { value: "1111111111" } });
  fireEvent.click(screen.getByRole("button", { name: "Open Messages preview →" }));
  expect(screen.getByText("To: 1111111111")).toBeTruthy();
  expect(within(screen.getByRole("dialog")).getByText("Messages simulation. The real app may display its preview differently.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Simulate Send →" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to entry details" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("heading", { name: "Your Entry Details" })).toBeTruthy();
});
