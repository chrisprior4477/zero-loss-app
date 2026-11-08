import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GroceryInspiration } from "./GroceryInspiration";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals();
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
});

test.each(["close", "cancel", "backdrop", "explore", "navigate"])("grocery ideas lock the viewport and restore its previous settings on %s", exit => {
  document.body.style.overflow = "auto";
  document.documentElement.style.overflow = "clip visible";
  const view = render(<GroceryInspiration offers={[{ slug: "publix", title: "$100 Publix Gift Card", entryPrice: 1, remaining: 10, href: "/items/publix" }]} />);
  const trigger = screen.getByRole("button", { name: "Explore Taco Night" });
  trigger.focus(); fireEvent.click(trigger);
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.documentElement.style.overflow).toBe("hidden");
  const dialog = screen.getByRole("dialog", { name: "Taco Night" });
  expect(screen.getByRole("link", { name: /\$100 Publix/ }).getAttribute("href")).toBe("/items/publix");
  if (exit === "close") fireEvent.click(screen.getByRole("button", { name: "Close grocery idea" }));
  if (exit === "cancel") fireEvent(dialog, new Event("cancel", { cancelable: true }));
  if (exit === "backdrop") fireEvent.click(dialog);
  if (exit === "explore") fireEvent.click(screen.getByRole("button", { name: "Keep exploring ideas" }));
  if (exit === "navigate") view.unmount();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("auto");
  expect(document.documentElement.style.overflow).toBe("clip visible");
  if (exit !== "navigate") expect(document.activeElement).toBe(trigger);
});

test("closing grocery ideas retains an existing outer scroll lock", () => {
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
  render(<GroceryInspiration offers={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Explore Taco Night" }));
  fireEvent.click(screen.getByRole("button", { name: "Close grocery idea" }));
  expect(document.documentElement.style.overflow).toBe("hidden");
  expect(document.body.style.overflow).toBe("hidden");
});
