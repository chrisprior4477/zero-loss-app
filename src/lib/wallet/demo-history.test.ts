import { expect, test } from "vitest";
import { parseDemoWalletHistoryVisibility } from "./demo-history";

test("only valid owner-scoped history IDs can control demo visibility", () => {
  const ledgerId = "11111111-1111-4111-8111-111111111111";
  const depositId = "22222222-2222-4222-8222-222222222222";
  expect(parseDemoWalletHistoryVisibility({ ledgerEntryIds: [ledgerId], fundingSessionIds: [depositId] }))
    .toEqual({ ledgerEntryIds: [ledgerId], fundingSessionIds: [depositId], fullReset: false });
  expect(parseDemoWalletHistoryVisibility({ ledgerEntryIds: [ledgerId], fundingSessionIds: [depositId], fullReset: true }).fullReset).toBe(true);
  expect(() => parseDemoWalletHistoryVisibility({ ledgerEntryIds: ["unverified"], fundingSessionIds: [] })).toThrow();
  expect(() => parseDemoWalletHistoryVisibility(null)).toThrow();
});
