import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DEMO_CARD_FIXTURES } from "@/lib/payments/demo-card";
const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/payments/actions", () => ({ saveDemoPaymentMethod: mocks.save }));
import { WalletPaymentMethods } from "./WalletPaymentMethods";
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test("adding a card saves the next sample in place without starting a deposit", async () => {
  mocks.save.mockResolvedValue({ status: "succeeded", message: "Saved" });
  const onFund = vi.fn();
  render(<WalletPaymentMethods savedCards={[{ token: "demo_card_4242", lastFour: "4242", isDefault: true }]} displayName="Tester" enabled unavailable={false} onFund={onFund} />);
  fireEvent.click(screen.getByRole("button", { name: "Add card" }));
  expect(screen.getByLabelText("Card number")).toHaveProperty("value", "5555 5555 5555 5556");
  fireEvent.click(screen.getByRole("button", { name: "Save card" }));
  await waitFor(() => expect(screen.getByText("Sample card saved.")).toBeTruthy());
  expect(screen.getByText("Test card •••• 5556")).toBeTruthy();
  expect(mocks.save.mock.calls[0][1].get("paymentMethod")).toBe("demo_card_5556");
  expect(mocks.save.mock.calls[0][1].get("cardNumber")).toBeNull();
  expect(onFund).not.toHaveBeenCalled();
});

test("all four cards explain availability and keep editing the selected sample", () => {
  render(<WalletPaymentMethods savedCards={DEMO_CARD_FIXTURES.map(f => ({ token: f.token, lastFour: f.lastFour, isDefault: false }))} displayName="Tester" enabled unavailable={false} onFund={vi.fn()} />);
  expect(screen.getByText(/All four sample cards are available/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Add card" })).toBeNull();
  fireEvent.click(screen.getAllByRole("button", { name: "Edit card / artwork" })[2]);
  expect(screen.getByLabelText("Card number")).toHaveProperty("value", "4000 0000 0000 1881");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getAllByRole("button", { name: "Use this card" })).toHaveLength(4);
  expect(mocks.save).not.toHaveBeenCalled();
});
