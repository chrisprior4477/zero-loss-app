import { expect, test } from "vitest";
import { entryProcessingNotifications } from "./entry-processing-notifications";
import type { LedgerEntryRow } from "@/lib/wallet/snapshot";

const base = { created_at: "2026-10-31T12:00:00Z", entryIds: ["entry-one"] };
const hold: LedgerEntryRow = { ...base, id: "hold", entry_type: "ENTRY_HOLD", amount: -100 };
const release: LedgerEntryRow = { ...base, id: "release", entry_type: "ENTRY_HOLD_RELEASE", amount: 100 };
const debit: LedgerEntryRow = { ...base, id: "purchase", entry_type: "ENTRY_DEBIT", amount: -100 };

test("a confirmed entry has one notice while financial records remain untouched", () => {
  const rows = [debit, release, hold];
  expect(entryProcessingNotifications(rows)).toEqual([debit]);
  expect(rows).toHaveLength(3);
  expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(-100);
});

test("pending and undone reservations are not mistaken for a completed purchase", () => {
  expect(entryProcessingNotifications([hold])).toEqual([hold]);
  expect(entryProcessingNotifications([release, hold])).toEqual([release, hold]);
});

test("nearby purchases for the same product never hide unrelated holds", () => {
  const other = { ...debit, entryIds: ["entry-two"] };
  expect(entryProcessingNotifications([other, release, hold])).toEqual([other, release, hold]);
  expect(entryProcessingNotifications([{ ...debit, entryIds: undefined }, release, hold])).toHaveLength(3);
});

test("every separate entry in a batch must be confirmed before collapsing its reservation", () => {
  const batch = { ...hold, entryIds: ["entry-one", "entry-two"] };
  expect(entryProcessingNotifications([debit, batch])).toEqual([debit, batch]);
  const second = { ...debit, id: "purchase-two", entryIds: ["entry-two"] };
  expect(entryProcessingNotifications([second, debit, batch])).toEqual([second, debit]);
});
