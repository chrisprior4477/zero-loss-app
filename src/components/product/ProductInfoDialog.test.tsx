import { afterEach, beforeEach, expect, test } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductInfoDialog } from "./ProductInfoDialog";

let previousOverflow: string;
let previousRootOverflow: string;
beforeEach(() => {
  previousOverflow = document.body.style.overflow;
  previousRootOverflow = document.documentElement.style.overflow;
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event("close")); };
});
afterEach(() => { cleanup(); document.body.style.overflow = previousOverflow; document.documentElement.style.overflow = previousRootOverflow; });

test.each(["close button", "backdrop", "native close"])("%s restores background scrolling and trigger focus", method => {
  document.body.style.overflow = "auto";
  document.documentElement.style.overflow = "clip visible";
  render(<ProductInfoDialog title="Product info" label="Open product info"><p>Product details stay readable.</p></ProductInfoDialog>);
  const trigger = screen.getByRole("button", { name: "Open product info" });
  fireEvent.click(trigger);
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.documentElement.style.overflow).toBe("hidden");
  const dialog = screen.getByRole("dialog");
  expect(screen.getByText("Product details stay readable.")).toBeTruthy();
  if (method === "close button") fireEvent.click(screen.getByRole("button", { name: "Close product info" }));
  else if (method === "backdrop") fireEvent.click(dialog);
  else act(() => (dialog as HTMLDialogElement).close());
  expect(document.body.style.overflow).toBe("auto");
  expect(document.documentElement.style.overflow).toBe("clip visible");
  expect(document.activeElement).toBe(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
});

test("navigation away from an open popup releases its scroll lock", () => {
  document.body.style.overflow = "clip visible";
  const view = render(<ProductInfoDialog title="Product info" label="Open product info"><p>Details</p></ProductInfoDialog>);
  fireEvent.click(screen.getByRole("button", { name: "Open product info" }));
  expect(document.body.style.overflow).toBe("hidden");
  view.unmount();
  expect(document.body.style.overflow).toBe("clip visible");
  expect(document.documentElement.style.overflow).toBe(previousRootOverflow);
});

test("closing this popup preserves an existing outer scroll lock", () => {
  document.body.style.overflow = "hidden";
  render(<ProductInfoDialog title="Product info" label="Open product info"><p>Details</p></ProductInfoDialog>);
  fireEvent.click(screen.getByRole("button", { name: "Open product info" }));
  fireEvent.click(screen.getByRole("button", { name: "Close product info" }));
  expect(document.body.style.overflow).toBe("hidden");
});
