import { expect, test } from "vitest";
import { availabilityForHref, filledPercent, parseAvailability } from "./availability";

const row = { slug: "walmart-25-gift-card", capacity: 75, sold: 71, remaining: 4, entryPriceCents: 100, repeatableScenario: false };
test("ordinary availability uses the database's sample-plus-purchase total", () => {
  const snapshot = parseAvailability([row]);
  expect(snapshot?.[row.slug].remaining).toBe(4);
  expect(availabilityForHref(snapshot, `/items/${row.slug}#enter-entry`)).toEqual(row);
  expect(filledPercent(row)).toBe(94);
});
test("known showcase scenarios retain their one-slot sample display", () => {
  const tv = { ...row, slug: "samsung-m70h-tv", capacity: 1200, sold: 1199, remaining: 1, repeatableScenario: true };
  expect(parseAvailability([tv])?.[tv.slug]).toEqual(tv);
  expect(filledPercent(tv)).toBe(99);
});
test.each([
  null, [], {}, [{ ...row, sold: 76 }], [{ ...row, sold: -1 }],
  [{ ...row, remaining: 5 }], [{ ...row, capacity: 0 }],
  [{ ...row, entryPriceCents: 1.5 }], [{ ...row, slug: "../../account" }], [row,row],
])("rejects invalid availability payload %j", data => expect(parseAvailability(data)).toBeNull());
test("only maps known item routes, never external or account links", () => {
  const snapshot = parseAvailability([row]);
  expect(availabilityForHref(snapshot, `https://example.com/items/${row.slug}`)).toBeUndefined();
  expect(availabilityForHref(snapshot, "/account/wallet")).toBeUndefined();
  expect(availabilityForHref(snapshot, "/items/missing")).toBeUndefined();
});
test("keeps only the documented aggregate fields", () => {
  expect(parseAvailability([{ ...row, customerId: "not-for-the-client" }])?.[row.slug]).toEqual(row);
});
