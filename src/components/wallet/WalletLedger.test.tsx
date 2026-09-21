import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WalletLedger } from "./WalletLedger";
afterEach(cleanup);
test("each transaction's support shortcut preserves its identity through filtering", () => {
  render(<WalletLedger entries={[
    { id: "11111111-1111-4111-8111-111111111111", entry_type: "DEPOSIT", amount: 500, created_at: "2026-09-21T12:00:00Z" },
    { id: "22222222-2222-4222-8222-222222222222", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-09-21T12:01:00Z" },
  ]} />);
  expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Entries" }));
  expect(screen.getByRole("link", { name: "Report a problem" }).getAttribute("href")).toBe("/support?transaction=22222222-2222-4222-8222-222222222222");
});
