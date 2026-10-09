import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EntryPageActions } from "./EntryPageActions";

vi.mock("./EntryOutcomeEmailPreference", () => ({ EntryOutcomeEmailPreference: () => null }));
afterEach(cleanup);

const props = {
  itemTitle: "PlayStation 5 Slim Model",
  slug: "playstation-5-slim",
  remaining: 6,
  crew: [{ id: "member-1", name: "Jordan" }],
  senderName: "Chris",
  emailEnabled: true,
  returnHref: "/account/entries?viewed=ent_11111111111111111111111111111111",
};

test("additional quantity continues through the existing confirmation flow", () => {
  render(<EntryPageActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add one extra entry" }));
  expect(screen.getByRole("link", { name: /Review 2 more entries/ }).getAttribute("href"))
    .toBe("/items/playstation-5-slim?quantity=2#enter-entry");
});

test("only selected approved Crew members receive a simulated on-screen acknowledgement", () => {
  render(<EntryPageActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Choose Crew members/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Jordan" }));
  fireEvent.click(screen.getByRole("button", { name: /Send demo alert to selected Crew/ }));
  expect(screen.getByRole("button", { name: "Demo alerts prepared for your Crew" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("No emails or messages were actually delivered.")).toBeTruthy();
  expect(screen.getByRole("link", { name: /View the PlayStation 5 Slim Model prize page/ }).getAttribute("href"))
    .toBe("/items/playstation-5-slim");
});
