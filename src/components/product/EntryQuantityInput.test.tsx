import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { EntryQuantityInput } from "./EntryQuantityInput";

afterEach(cleanup);

function Selector({ maximum = 150, disabled = false }: { maximum?: number; disabled?: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const [draft, setDraft] = useState<string | null>(null);
  return <EntryQuantityInput value={quantity} maximum={maximum} label="Quantity" disabled={disabled} onChange={setQuantity} invalidDraft={draft} onInvalidDraft={setDraft} />;
}

test("typing replaces the number and Enter keeps focus without submitting", () => {
  const submit = vi.fn(event => event.preventDefault());
  render(<form onSubmit={submit}><Selector /></form>);
  const input = screen.getByRole("spinbutton", { name: "Quantity" }) as HTMLInputElement;
  input.focus();
  expect(input.selectionStart).toBe(0);
  expect(input.selectionEnd).toBe(1);
  expect(input.inputMode).toBe("numeric");
  fireEvent.change(input, { target: { value: "101" } });
  expect(input.value).toBe("101");
  expect(input.getAttribute("aria-valuenow")).toBe("101");
  fireEvent.keyDown(input, { key: "Enter" });
  expect(document.activeElement).toBe(input);
  expect(submit).not.toHaveBeenCalled();
});

test("invalid and empty input cannot turn into an unintended ticket quantity", () => {
  render(<Selector />);
  const input = screen.getByRole("spinbutton") as HTMLInputElement;
  for (const value of ["1.25", "-2", "1e2", "2147483648", "999999999999999999999999"]) {
    fireEvent.change(input, { target: { value } });
    expect(input.value).toBe(value);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  }
  fireEvent.change(input, { target: { value: "" } });
  expect(input.value).toBe("");
  fireEvent.blur(input);
  expect(input.value).toBe("");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(input, { target: { value: "0" } });
  fireEvent.blur(input);
  expect(input.value).toBe("0");
  fireEvent.keyDown(input, { key: "Escape" });
  expect(input.value).toBe("1");
  fireEvent.change(input, { target: { value: "7" } });
  fireEvent.change(input, { target: { value: "7." } });
  fireEvent.change(input, { target: { value: "7.5" } });
  expect(input.value).toBe("7.5");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(input, { target: { value: "8" } });
  expect(input.getAttribute("aria-valuenow")).toBe("8");
});

test("typing and arrow keys respect actual remaining capacity", () => {
  render(<Selector maximum={6} />);
  const input = screen.getByRole("spinbutton") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "25" } });
  expect(input.value).toBe("6");
  fireEvent.keyDown(input, { key: "ArrowUp" });
  expect(input.value).toBe("6");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(input.value).toBe("5");
});
