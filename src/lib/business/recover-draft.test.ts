import { expect, test } from "vitest";
import { blankDraft, type BusinessDraft, type PartnerListing } from "./application";
import { recoverBusinessDraft } from "./recover-draft";

const listing = (id: string): PartnerListing => ({
  id, title: id, brand: "Example", category: "Tools", value: 25, entryPrice: 1, capacity: 75,
  summary: "Original", highlights: [], specifications: [], included: [], fulfillment: "Partner", availability: "Available",
});

test("merges independent listing edits and retains attachments by listing identity", () => {
  const first = listing("first");
  const second = listing("second");
  const base: BusinessDraft = { ...blankDraft, listings: [first, second], files: [{ id: "one", name: "one.png", listingIndex: 1 }] };
  const local = { ...base, listings: [{ ...first, title: "New name" }, second] };
  const saved = { ...base, listings: [{ ...second, capacity: 60 }, first], files: [{ ...base.files[0], listingIndex: 0 }] };
  const result = recoverBusinessDraft(base, local, saved);
  expect(result.draft.listings).toEqual([{ ...second, capacity: 60 }, { ...first, title: "New name" }]);
  expect(result.draft.files[0].listingIndex).toBe(0);
  expect(result.conflicts).toEqual([]);
});

test("flags overlapping listing changes and retains the local edit for review", () => {
  const first = listing("first");
  const base = { ...blankDraft, listings: [first] };
  const result = recoverBusinessDraft(base, { ...base, listings: [{ ...first, summary: "My edit" }] },
    { ...base, listings: [{ ...first, summary: "Other edit", capacity: 64 }] });
  expect(result.draft.listings[0]).toMatchObject({ summary: "My edit", capacity: 64 });
  expect(result.conflicts).toEqual(["first · summary"]);
});
