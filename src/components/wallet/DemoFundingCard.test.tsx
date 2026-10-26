import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoFundingCard } from "./DemoFundingCard";

afterEach(cleanup);
test("See card flips to the sample artwork and back without removing saved actions", () => {
  render(<DemoFundingCard token="demo_card_4242" selected saved actions={<button>Delete Card</button>}><label><input type="radio" />Use for this deposit</label></DemoFundingCard>);
  expect(screen.getByText("SAVED")).toBeTruthy();
  expect(screen.queryByRole("img", { name: /Sample card front/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "See card" }));
  expect(screen.getByRole("img", { name: /Sample card front/ })).toBeTruthy();
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.getByRole("button", { name: "Delete Card" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See back" }));
  expect(screen.getByRole("img", { name: /Sample card back/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Card details" }));
  expect(screen.getByRole("radio", { name: "Use for this deposit" })).toBeTruthy();
});
