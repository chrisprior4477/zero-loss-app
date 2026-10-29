import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { WalletRollerPicker } from "./WalletRollerPicker";

const options = [{ value: "10", label: "$10" }, { value: "25", label: "$25" }, { value: "50", label: "$50" }];
const changed = vi.fn();
function Picker() {
  const [value, setValue] = useState("25");
  return <WalletRollerPicker label="Amount" placeholder="Choose" options={options} value={value} onChange={next => { changed(next); setValue(next); }} />;
}
afterEach(() => { cleanup(); vi.useRealTimers(); changed.mockClear(); vi.restoreAllMocks(); });

test("rolling only browses; tapping acknowledges in green then closes with the new value", () => {
  vi.useFakeTimers();
  const { container } = render(<Picker />);
  fireEvent.click(screen.getByRole("button", { name: "Amount $25" }));
  const wheel = screen.getByRole("radiogroup", { name: "Amount" });
  expect(container.contains(wheel)).toBe(false); // Portal cannot resize or be clipped by the wallet ticket.
  fireEvent.scroll(wheel, { target: { scrollTop: 96 } });
  act(() => vi.advanceTimersByTime(30));
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByRole("radio", { name: "$25" }).getAttribute("aria-checked")).toBe("true");
  const fifty = screen.getByRole("radio", { name: "$50" });
  expect(fifty.className).not.toContain("confirmed");
  fireEvent.click(fifty);
  expect(fifty.className).toContain("confirmed");
  expect(changed).toHaveBeenCalledExactlyOnceWith("50");
  expect(fifty.getAttribute("aria-checked")).toBe("true");
  expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  act(() => vi.advanceTimersByTime(180));
  expect(screen.queryByRole("radiogroup")).toBeNull();
  const trigger = screen.getByRole("button", { name: "Amount $50" });
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  expect(screen.getByRole("radio", { name: "$50" }).className).not.toContain("confirmed");
});

test("keyboard browsing needs Enter; Escape and outside taps do not change the value", () => {
  Element.prototype.scrollTo = vi.fn();
  render(<Picker />);
  const trigger = screen.getByRole("button", { name: "Amount $25" });
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowDown" });
  expect(changed).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "Escape" });
  expect(screen.queryByRole("radiogroup")).toBeNull();
  expect(changed).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("radiogroup")).toBeNull();
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "End" });
  fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "Enter" });
  expect(changed).toHaveBeenCalledExactlyOnceWith("50");
});

test("locked controls close the wheel and cannot select", () => {
  const props = { label: "Amount", placeholder: "Choose", options, value: "25", onChange: changed };
  const { rerender } = render(<WalletRollerPicker {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Amount $25" }));
  rerender(<WalletRollerPicker {...props} disabled />);
  expect(screen.queryByRole("radiogroup")).toBeNull();
  expect((screen.getByRole("button", { name: "Amount $25" }) as HTMLButtonElement).disabled).toBe(true);
  expect(changed).not.toHaveBeenCalled();
});
