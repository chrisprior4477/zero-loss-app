import { expect, test } from "vitest";
import { storedActivityFixture } from "./activity.test-fixture";
import { purchaseOptionSummary } from "./purchase-option-summary";

const option = { ...storedActivityFixture().activity[2], paidCents: 100, remainingCents: 7400, completionExpiresAt: "2026-11-24T18:00:00Z" };

test("shows a single option's actual remainder, credit and deadline", () => {
  expect(purchaseOptionSummary([option])).toEqual({ remaining: "$74", applied: "$1", multiple: false, deadline: option.completionExpiresAt, earliestDeadline: false });
});

test("several options show ranges and the first deadline without combining credit", () => {
  expect(purchaseOptionSummary([option, { ...option, paidCents: 200, remainingCents: 7300, completionExpiresAt: "2026-11-20T18:00:00Z" }]))
    .toEqual({ remaining: "$73–$74", applied: "$1–$2", multiple: true, deadline: "2026-11-20T18:00:00Z", earliestDeadline: true });
  expect(purchaseOptionSummary(Array(10).fill(option))?.applied).toBe("$1");
});

test("missing and invalid deadlines are not invented", () => {
  expect(purchaseOptionSummary([{ ...option, completionExpiresAt: "bad" }])?.deadline).toBeNull();
  expect(purchaseOptionSummary([{ ...option, completionExpiresAt: null }, option])?.earliestDeadline).toBe(true);
  expect(purchaseOptionSummary([])).toBeNull();
});
