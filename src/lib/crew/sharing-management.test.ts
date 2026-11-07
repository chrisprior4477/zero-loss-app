import { expect, test } from "vitest";
import { cleanupCutoff, entrySharedAtInScope, entrySharedInScope } from "./sharing-management";
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

test("a fresh audience does not inherit an older audience's sharing clock", () => {
  const scoped = { ...entry, sharedAt: "2026-01-01T12:00:00Z", audienceSharedAt: { family: "2026-01-01T12:00:00Z", friends: "2026-11-07T01:00:00Z" } };
  expect(entrySharedAtInScope(scoped, "friends")).toBe("2026-11-07T01:00:00Z");
  expect(entrySharedAtInScope(scoped, "family")).toBe("2026-01-01T12:00:00Z");
  expect(entrySharedAtInScope(scoped, "crew")).toBeNull();
  expect(entrySharedAtInScope({ ...entry, sharedAt: "2026-01-01" }, "crew")).toBe("2026-01-01");
});
