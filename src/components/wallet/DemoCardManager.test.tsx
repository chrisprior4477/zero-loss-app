import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/lib/payments/actions", () => ({ saveDemoPaymentMethod: vi.fn() }));
import { DemoCardManager } from "./DemoCardManager";

afterEach(cleanup);

test("card screen is editable but submits only the safe preview token", () => {
  const { container } = render(<DemoCardManager displayName="Chris Prior" enabled />);
  expect(screen.getByRole("heading", { name: "Add a card" })).toBeTruthy();
  for (const label of ["Cardholder name", "Card number", "Expiry", "Security code"]) {
    const input = screen.getByLabelText(label) as HTMLInputElement;
    expect(input.readOnly).toBe(false);
    expect(input.name).toBe("");
  }
  const form = new FormData(container.querySelector("form")!);
  expect(form.get("paymentMethod")).toBe("demo_card_4242");
  expect(form.get("makeDefault")).toBe("true");
  expect([...form.values()]).not.toContain("4242 4242 4242 4242");
  expect([...form.values()]).not.toContain("123");
  expect(screen.getByRole("link", { name: "Back to wallet" }).getAttribute("href")).toBe("/account/wallet?view=history#add-funds");
});

test("real card details are stopped in the browser and never sent", () => {
  const { container } = render(<DemoCardManager displayName="Chris Prior" enabled />);
  fireEvent.change(screen.getByLabelText("Card number"), { target: { value: "4111 1111 1111 1111" } });
  fireEvent.submit(container.querySelector("form")!);
  expect(screen.getByRole("alert").textContent).toContain("Real card details are not accepted");
});

test("existing method can update its explicit default preference", () => {
  const { container } = render(<DemoCardManager displayName="Chris Prior" enabled savedCard={{ token: "demo_card_4242", lastFour: "4242", isDefault: true }} />);
  expect(screen.getByText("Current default payment method")).toBeTruthy();
  const checkbox = screen.getByRole("checkbox", { name: "Use this card for future preview transactions" }) as HTMLInputElement;
  fireEvent.click(checkbox);
  expect(container.querySelector<HTMLInputElement>('[name="makeDefault"]')?.value).toBe("false");
  expect(screen.getByRole("button", { name: /Update card/ })).toBeTruthy();
});
