import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { RewardRedemptionActions } from "./RewardRedemptionActions";

afterEach(cleanup);

test("every preview reward offers an orange shopping exit before the wallet-pass note", () => {
  const { container } = render(<RewardRedemptionActions displayCode="123456789012" isPreview />);
  const googleWallet = screen.getByRole("button", { name: "Save to Google Wallet" });
  const shopping = screen.getByRole("link", { name: "Continue Shopping" });
  const note = screen.getByText("Wallet passes are not connected in this preview yet.");

  expect(shopping.getAttribute("href")).toBe("/");
  expect(shopping.className).toContain("bg-[#ff7417]");
  expect(container.textContent!.indexOf(googleWallet.textContent!)).toBeLessThan(container.textContent!.indexOf(shopping.textContent!));
  expect(container.textContent!.indexOf(shopping.textContent!)).toBeLessThan(container.textContent!.indexOf(note.textContent!));
});

test("the shopping exit remains available when wallet pass links are connected", () => {
  render(<RewardRedemptionActions displayCode="123456789012" isPreview={false} appleWalletUrl="/apple-pass" googleWalletUrl="/google-pass" />);

  expect(screen.getByRole("link", { name: "Continue Shopping" }).getAttribute("href")).toBe("/");
  expect(screen.queryByText("Wallet passes are not connected in this preview yet.")).toBeNull();
});
