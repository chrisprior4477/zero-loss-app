import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { RewardRedemptionActions } from "./RewardRedemptionActions";

afterEach(cleanup);

test("every preview reward offers a green shopping exit before the wallet-pass note", () => {
  const { container } = render(<RewardRedemptionActions displayCode="123456789012" isPreview />);
  const googleWallet = screen.getByRole("button", { name: "Add to Google Wallet" });
  const shopping = screen.getByRole("link", { name: "Continue Shopping" });
  const note = screen.getByText("Wallet passes are not connected in this preview yet.");

  expect(shopping.getAttribute("href")).toBe("/browse");
  expect(shopping.className).toContain("bg-[#31e800]");
  expect(container.textContent!.indexOf(googleWallet.textContent!)).toBeLessThan(container.textContent!.indexOf(shopping.textContent!));
  expect(container.textContent!.indexOf(shopping.textContent!)).toBeLessThan(container.textContent!.indexOf(note.textContent!));
});

test("the shopping exit remains available when wallet pass links are connected", () => {
  render(<RewardRedemptionActions displayCode="123456789012" isPreview={false} appleWalletUrl="/apple-pass" googleWalletUrl="/google-pass" />);

  expect(screen.getByRole("link", { name: "Continue Shopping" }).getAttribute("href")).toBe("/browse");
  expect(screen.queryByText("Wallet passes are not connected in this preview yet.")).toBeNull();
});

test("copying still works without a redundant barcode reveal action", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<RewardRedemptionActions displayCode="123456789012" isPreview />);
  expect(screen.queryByRole("button", { name: /Show barcode|Show code/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Copy number" }));
  expect(await screen.findByRole("status")).toHaveProperty("textContent", "Sample number copied.");
  expect(writeText).toHaveBeenCalledWith("123456789012");
  expect((screen.getByRole("button", { name: "Add to Apple Wallet" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Add to Google Wallet" }) as HTMLButtonElement).disabled).toBe(true);
});
