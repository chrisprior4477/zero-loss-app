import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

test("the letter preview keeps personal fields out of history and browser Back restores edited instructions", async () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  try {
    render(<FreeEntryPrintCard offeringTitle="AirPods" offeringSlug="airpods-pro" initialAccountReference="DEMO-123" />);
    const initialUrl = window.location.href;
    fireEvent.change(screen.getByRole("textbox", { name: "Your full legal name" }), { target: { value: "Sample Tester" } });
    fireEvent.click(screen.getByRole("button", { name: "Print entry insert" }));
    expect(screen.getByRole("region", { name: "Letter-size print preview" })).toBeTruthy();
    expect(window.location.href).toBe(`${initialUrl}#print-entry-insert`);
    const pdf = screen.getByRole("button", { name: "Open printable PDF" }).closest("form")!;
    expect(pdf.getAttribute("action")).toBe("/api/free-entry-pdf");
    expect(pdf.method).toBe("post");
    expect(new FormData(pdf).get("name")).toBe("Sample Tester");
    expect(new FormData(pdf).get("account")).toBe("DEMO-123");
    window.history.back();
    expect(await screen.findByRole("textbox", { name: "Your full legal name" })).toHaveProperty("value", "Sample Tester");
    expect(window.location.href).toBe(initialUrl);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Print entry insert" }));
  } finally { scroll.mockRestore(); }
});
