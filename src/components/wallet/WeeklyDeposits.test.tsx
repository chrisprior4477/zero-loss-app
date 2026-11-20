import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { WeeklyDeposits } from "./WeeklyDeposits";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";

vi.mock("@/components/layout/useMenuViewport", () => ({ useMenuViewport: () => "desktop" }));
afterEach(cleanup);

const request = (id: string, amount: number): DemoFundingRequest => ({
  id, amount, currency: "USD", status: "succeeded", created_at: "2026-11-18T12:00:00Z",
  postedAt: "2026-11-18T12:00:00Z", idempotencyKey: `test-deposit-${id}`, reconciliation: "reconciled",
});

test("an exact weekly bookmark opens the archived receipt without adding it to chart totals", async () => {
  const archived = request("archived", 1800);
  render(<WeeklyDeposits requests={[archived, request("current", 2400)]} hiddenIds={[archived.id]}
    restoreReceipt={archived.idempotencyKey} asOf="2026-11-20T12:00:00Z" />);
  expect(await screen.findByText("Archived deposit receipt")).toBeTruthy();
  await waitFor(() => expect(screen.getByText("View $18 receipt").closest("details")).toHaveProperty("open", true));
  expect(screen.queryByText("View $24 receipt")).toBeNull();
});

test("a hidden archive or missing bookmark does not show an unrelated latest receipt", () => {
  const archived = request("archived", 1800);
  render(<WeeklyDeposits requests={[archived, request("current", 2400)]} hiddenIds={[archived.id]} hideArchived
    restoreReceipt={archived.idempotencyKey} asOf="2026-11-20T12:00:00Z" />);
  expect(screen.getByText("This deposit receipt is unavailable.")).toBeTruthy();
  expect(screen.queryByText("View $24 receipt")).toBeNull();
});
