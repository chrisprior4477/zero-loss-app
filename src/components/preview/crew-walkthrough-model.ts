// Fictional, in-memory walkthrough fixtures. Never import account writers here.
export type SharingJourney = "text" | "crew" | "group" | "add";
export type PreviewPerson = { id: number; name: string; phone: string; email: string };
export type PreviewGroup = { id: string; name: string; memberIds: number[] };
export type PreviewCrew = { memberIds: number[]; groups: PreviewGroup[] };

export const previewPeople: PreviewPerson[] = Array.from({ length: 5 }, (_, index) => {
  const id = index + 1;
  return { id, name: `Test Customer ${id}`, phone: String(id).repeat(10), email: `testcustomer${id}@example.test` };
});

export const sharingJourneys: { id: SharingJourney; title: string; description: string }[] = [
  { id: "text", title: "Text anyone", description: "Open a ready-made message. Send from your own phone." },
  { id: "crew", title: "Share with your Crew", description: "See who receives it, share, and return to your entry." },
  { id: "group", title: "Share with a group", description: "Choose a group, add people, or create a new group." },
  { id: "add", title: "Find & add people", description: "Search by name, phone, or email. Add and keep going." },
];

export function isSharingJourney(value: unknown): value is SharingJourney {
  return sharingJourneys.some(journey => journey.id === value);
}

export function initialPreviewCrew(): PreviewCrew {
  return { memberIds: [2, 3], groups: [{ id: "mom", name: "Mom", memberIds: [2] }, { id: "test", name: "Test", memberIds: [] }] };
}

export function findPreviewPeople(value: string): PreviewPerson[] {
  const query = value.trim().toLowerCase();
  if (query.includes("@")) return previewPeople.filter(person => person.email === query);
  if (/^[+\d ()\-.]+$/.test(query)) {
    const digits = query.replace(/\D/g, "");
    return digits.length >= 10 ? previewPeople.filter(person => person.phone === digits || `1${person.phone}` === digits) : [];
  }
  if (query.length < 3) return [];
  return previewPeople.filter(person => query.split(/\s+/).every(word => person.name.toLowerCase().includes(word)));
}

export function addPreviewPerson(crew: PreviewCrew, personId: number, groupId: string | null): PreviewCrew {
  if (!previewPeople.some(person => person.id === personId)) return crew;
  if (groupId && !crew.groups.some(group => group.id === groupId)) return crew;
  return {
    memberIds: [...new Set([...crew.memberIds, personId])],
    groups: crew.groups.map(group => group.id === groupId
      ? { ...group, memberIds: [...new Set([...group.memberIds, personId])] } : group),
  };
}

export function savePreviewGroup(crew: PreviewCrew, id: string | null, name: string, memberIds: number[]): PreviewCrew {
  const cleanName = name.trim().slice(0, 50);
  const validIds = [...new Set(memberIds)].filter(memberId => previewPeople.some(person => person.id === memberId));
  if (!cleanName || (id && !crew.groups.some(group => group.id === id))) return crew;
  const group = { id: id ?? `preview-group-${crew.groups.length + 1}`, name: cleanName, memberIds: validIds };
  return {
    memberIds: [...new Set([...crew.memberIds, ...validIds])],
    groups: id ? crew.groups.map(existing => existing.id === id ? group : existing) : [...crew.groups, group],
  };
}
