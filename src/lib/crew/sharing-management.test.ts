import { expect, test } from "vitest";
import { cleanupCutoff, entrySharedInScope } from "./sharing-management";
import { defaultCrewVisibilityRule } from "./visibility";

const entry = { id: "entry", title: "TV", retailer: "Best Buy", image: null, shared: true, createdAt: "2026-01-01" };
test("Crew and group views match effective audiences, including inherited settings", () => {
  const group = { audience: "groups" as const, memberIds: [], groupIds: ["family", "friends"] };
  expect(entrySharedInScope(entry, "crew", defaultCrewVisibilityRule, {})).toBe(true);
  expect(entrySharedInScope(entry, "family", defaultCrewVisibilityRule, {})).toBe(false);
  expect(entrySharedInScope(entry, "family", group, {})).toBe(true);
  expect(entrySharedInScope(entry, "crew", group, {})).toBe(false);
  expect(entrySharedInScope(entry, "friends", defaultCrewVisibilityRule, { entry: group })).toBe(true);
  expect(entrySharedInScope({ ...entry, shared: false }, "family", group, {})).toBe(false);
  expect(entrySharedInScope(entry, "crew", { audience: "people", memberIds: [], groupIds: [] }, {})).toBe(false);
});
test("cleanup keeps recent shares and treats six months as calendar months", () => {
  expect(cleanupCutoff(30, new Date("2026-11-06T15:00:00Z"))).toBe("2026-10-07T15:00:00.000Z");
  expect(cleanupCutoff(180, new Date("2026-08-31T15:00:00Z"))).toBe("2026-02-28T15:00:00.000Z");
  expect(cleanupCutoff(0)).toBeUndefined();
});
