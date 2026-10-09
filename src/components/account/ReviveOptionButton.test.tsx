import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ revive: vi.fn(), replace: vi.fn() }));
vi.mock("@/lib/account/lifecycle-actions", () => ({ revivePurchaseOption: mocks.revive }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
import { ReviveOptionButton } from "./ReviveOptionButton";

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

test("a declined demo option can be revived before its original deadline", async () => {
  mocks.revive.mockResolvedValue({ status: "succeeded", message: "Revived", href: "/account/entries?filter=completion" });
  render(<ReviveOptionButton optionId="11111111-1111-4111-8111-111111111111" expiresAt="2099-01-01T00:00:00Z" />);
  const button = await screen.findByRole("button", { name: "Revive" });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
  await waitFor(() => expect(mocks.revive).toHaveBeenCalledOnce());
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account/entries?filter=completion"));
});

test("an expired declined option cannot be revived from the page", async () => {
  render(<ReviveOptionButton optionId="11111111-1111-4111-8111-111111111111" expiresAt="2020-01-01T00:00:00Z" />);
  const button = await screen.findByRole("button", { name: "Expired" });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.revive).not.toHaveBeenCalled();
});
