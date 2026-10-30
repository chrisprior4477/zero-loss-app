import { expect, test } from "vitest";
import { addPreviewPerson, findPreviewPeople, initialPreviewCrew, savePreviewGroup } from "./crew-walkthrough-model";

test("typeahead finds the same fictional customer by name, email, or formatted phone", () => {
  for (const query of ["Test Customer 1", "TESTCUSTOMER1@example.test", "(111) 111-1111", "+1 111 111 1111"]) {
    expect(findPreviewPeople(query).map(person => person.id)).toEqual([1]);
  }
  expect(findPreviewPeople("tes")).toHaveLength(5);
  expect(findPreviewPeople("te")).toEqual([]);
  expect(findPreviewPeople("11111")).toEqual([]);
  expect(findPreviewPeople("testcustomer1@")).toEqual([]);
});

test("adding to a group also adds to Crew and retrying never duplicates the person", () => {
  const original = initialPreviewCrew();
  const added = addPreviewPerson(original, 1, "test");
  const retried = addPreviewPerson(added, 1, "test");
  expect(retried.memberIds).toEqual([2, 3, 1]);
  expect(retried.groups.find(group => group.id === "test")?.memberIds).toEqual([1]);
  expect(original.memberIds).toEqual([2, 3]);
  expect(original.groups.find(group => group.id === "test")?.memberIds).toEqual([]);
});

test("a stale group or unknown fixture cannot change Crew", () => {
  const crew = initialPreviewCrew();
  expect(addPreviewPerson(crew, 1, "missing")).toBe(crew);
  expect(addPreviewPerson(crew, 99, null)).toBe(crew);
});

test("saving a new group connects selected people and retains other groups", () => {
  const crew = initialPreviewCrew();
  const next = savePreviewGroup(crew, null, " Movie night ", [1, 1, 5, 99]);
  expect(next.groups).toHaveLength(3);
  expect(next.groups[2]).toEqual({ id: "preview-group-3", name: "Movie night", memberIds: [1, 5] });
  expect(next.memberIds).toEqual([2, 3, 1, 5]);
  expect(crew.groups).toHaveLength(2);
});

test("editing a group replaces just that group's members, with no blank-name saves", () => {
  const crew = initialPreviewCrew();
  expect(savePreviewGroup(crew, "mom", " ", [1])).toBe(crew);
  const next = savePreviewGroup(crew, "mom", "Family", [2, 4]);
  expect(next.groups[0]).toEqual({ id: "mom", name: "Family", memberIds: [2, 4] });
  expect(next.groups[1]).toEqual(crew.groups[1]);
});
