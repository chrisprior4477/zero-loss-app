import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { saveEntryIntent } from "@/lib/entries/return-intent";
import { ContinueEntryBanner } from "./ContinueEntryBanner";

afterEach(() => { cleanup(); sessionStorage.clear(); });

test("offers a compact continuation on mobile and desktop without a saved entry record", () => {
  saveEntryIntent("samsung-m70h-tv", "Samsung 50-inch TV", 4);
  render(<ContinueEntryBanner />);
  expect(screen.getByText("Samsung 50-inch TV")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Continue your entry" }).getAttribute("href")).toBe("/items/samsung-m70h-tv?quantity=4#enter-entry");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss continue entry prompt" }));
  expect(screen.queryByRole("link", { name: "Continue your entry" })).toBeNull();
  expect(sessionStorage.getItem("zero-loss-entry-intent-v1")).toBeNull();
});

test("does not show the prompt without a recent explicit selection", () => {
  render(<ContinueEntryBanner />);
  expect(screen.queryByRole("link", { name: "Continue your entry" })).toBeNull();
});
