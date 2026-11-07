import { afterEach, expect, test, vi } from "vitest";
import { savePurchaseHandoff, readPurchaseHandoff } from "./purchase-selection-handoff";
afterEach(() => { localStorage.clear(); vi.useRealTimers(); });
test("wallet links identify immutable choices rather than the last choice from another tab", () => {
  const first = { ownerId: "a", slug: "switch", available: ["1", "2"], selected: ["1", "2"], decline: false, needsReview: false };
  const original = savePurchaseHandoff(first);
  const second = savePurchaseHandoff({ ...first, selected: ["2"], decline: true });
  expect(original).not.toBe(second);
  expect(JSON.parse(readPurchaseHandoff(original)!)).toMatchObject(first);
  expect(JSON.parse(readPurchaseHandoff(second)!)).toMatchObject({ selected: ["2"], decline: true });
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000);
  expect(readPurchaseHandoff(original)).toBeNull();
  expect(readPurchaseHandoff("../../somewhere")).toBeNull();
});
