import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FreeEntryPrintCard } from "./FreeEntryPrintCard";

afterEach(cleanup);

test("signed-in legal identity fills the prototype and the rectangular address side appears first", () => {
  render(<FreeEntryPrintCard offeringTitle="$75 HomeGoods Gift Card" offeringSlug="homegoods-75-gift-card"
    initialLegalName="Sample Tester" initialAccountReference="DEMO-123456789ABC" />);
  expect((screen.getByRole("textbox", { name: "Your full legal name" }) as HTMLInputElement).value).toBe("Sample Tester");
  const reference = screen.getByRole("textbox", { name: "Zero Loss account reference" }) as HTMLInputElement;
  expect(reference.value).toBe("DEMO-123456789ABC");
  expect(reference.readOnly).toBe(true);
  const addressSide = screen.getAllByText("Mail-in entry request")[0].closest("[aria-hidden]");
  expect(addressSide?.getAttribute("aria-hidden")).toBe("false");
  expect(addressSide?.className).toContain("border-slate-300");
  expect(addressSide?.className).not.toContain("rounded-[22px]");
  expect(screen.getByText("PROTOTYPE—DO NOT MAIL")).toBeTruthy();
});

test("signed-out preview does not show a different person's sample name or account", () => {
  render(<FreeEntryPrintCard offeringTitle="$75 HomeGoods Gift Card" offeringSlug="homegoods-75-gift-card" />);
  expect((screen.getByRole("textbox", { name: "Your full legal name" }) as HTMLInputElement).value).toBe("");
  expect((screen.getByRole("textbox", { name: "Zero Loss account reference" }) as HTMLInputElement).value).toBe("");
});
