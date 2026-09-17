import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoParticipationPanel } from "./DemoParticipationPanel";
afterEach(cleanup);
const props = { productTitle: "Test product", retailer: "Test store", productValue: 100, entryPrice: 1, sold: 9, capacity: 10 };
test("product balance comes from server data, not a fixture; entry action remains non-purchasing", () => {
  render(<DemoParticipationPanel {...props} balanceLabel="$26" isDemoWallet />);
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("$26");
  expect(screen.queryByText("$24.00")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Enter for $1.00" }));
  expect(screen.getByRole("status").textContent).toContain("Entry checkout is not enabled yet");
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("$26");
});
test("failed product balance cannot become zero", () => {
  render(<DemoParticipationPanel {...props} />);
  expect(screen.getByTestId("product-wallet-balance").textContent).toBe("Unavailable");
});
