import { expect, test } from "vitest";
import { crewVisibilitySnapshot, isCrewGroupContact, isCrewVisibilityGroup } from "./visibility";
const id = "11111111-1111-4111-8111-111111111111";
const contact = { id, name: "Mom", phone: "+1 (202) 555-0123", email: "mom@example.test" };
test("contact validation allows either channel but rejects invalid and oversized details", () => {
  expect(isCrewGroupContact(contact)).toBe(true);
  expect(isCrewGroupContact({ ...contact, phone: "" })).toBe(true);
  expect(isCrewGroupContact({ ...contact, email: "" })).toBe(true);
  for (const bad of [{ phone: "", email: "" }, { phone: "123" }, { email: "bad@" }, { name: " " }, { id: "not-id" }, { name: "x".repeat(81) }]) expect(isCrewGroupContact({ ...contact, ...bad })).toBe(false);
});
test("duplicate contacts are rejected; legacy groups still load", () => {
  expect(isCrewVisibilityGroup({ id, name: "Mom", memberIds: [] })).toBe(true);
  expect(isCrewVisibilityGroup({ id, name: "Mom", memberIds: [], contacts: [contact, contact] })).toBe(false);
});
test("normalization preserves saved contacts while removing unapproved sharing permissions", () => {
  const snapshot = crewVisibilitySnapshot({ groups: [{ id, name: "Mom", memberIds: [id], contacts: [contact] }], default_rule: { audience: "groups", groupIds: [id], memberIds: [] }, entry_rules: {} }, new Set());
  expect(snapshot.groups[0].contacts).toEqual([contact]);
  expect(snapshot.groups[0].memberIds).toEqual([]);
  expect(snapshot.defaultRule.groupIds).toEqual([id]);
});
