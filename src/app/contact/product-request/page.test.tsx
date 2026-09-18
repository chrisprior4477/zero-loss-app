import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import ProductRequestPage from "./page";

test("prefills the requested product from an empty search", async () => {
  render(await ProductRequestPage({ searchParams: Promise.resolve({ product: "kayak" }) }));

  expect(screen.getByRole("heading", { name: "What would you love to see on Zero Loss?" })).toBeTruthy();
  expect((screen.getByLabelText("What would you like to see?") as HTMLInputElement).value).toBe("kayak");
  expect(screen.getByRole("button", { name: "Send product request →" })).toBeTruthy();
});
