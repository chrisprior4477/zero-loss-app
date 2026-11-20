import type { BusinessDraft, BusinessFile, PartnerListing } from "./application";

function same(first: unknown, second: unknown) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function mergeObject<T extends object>(base: T, local: T, saved: T, onConflict: (field: string) => void): T {
  const changes: Partial<T> = {};
  for (const field of Object.keys({ ...base, ...local }) as (keyof T)[]) {
    if (!same(local[field], base[field])) {
      if (!same(saved[field], base[field]) && !same(saved[field], local[field])) onConflict(String(field));
      changes[field] = local[field];
    }
  }
  return { ...saved, ...changes };
}

function byListing(draft: BusinessDraft) {
  return new Map(draft.listings.map((listing, index) => [listing.id ?? `legacy-${index}`, listing]));
}

type LinkedFile = Omit<BusinessFile, "listingIndex"> & { listingId: string | null };

function byFile(draft: BusinessDraft) {
  return new Map(draft.files.map(({ listingIndex, ...file }) => {
    const listingId = listingIndex === null ? null : draft.listings[listingIndex]?.id ?? `legacy-${listingIndex}`;
    return [file.id, { ...file, listingId }];
  }));
}

function mergeRows<T extends object>(
  base: Map<string, T>, local: Map<string, T>, saved: Map<string, T>,
  label: (row: T) => string, conflicts: Set<string>,
) {
  const merged = new Map(saved);
  for (const id of new Set([...base.keys(), ...local.keys()])) {
    const previous = base.get(id);
    const edited = local.get(id);
    const current = saved.get(id);
    if (same(previous, edited)) continue;
    if (previous && edited && current) {
      merged.set(id, mergeObject(previous, edited, current, field => conflicts.add(`${label(edited)} · ${field}`)));
      continue;
    }
    if (!same(previous, current) && !same(edited, current)) {
      const changed = edited ?? current;
      if (changed) conflicts.add(label(changed));
    }
    if (edited) merged.set(id, edited);
    else merged.delete(id);
  }
  return merged;
}

export function recoverBusinessDraft(base: BusinessDraft, local: BusinessDraft, saved: BusinessDraft) {
  const conflicts = new Set<string>();
  const listings = [...mergeRows(byListing(base), byListing(local), byListing(saved),
    (listing: PartnerListing) => listing.title || "Unnamed listing", conflicts).entries()];
  const indexById = new Map(listings.map(([id], index) => [id, index]));
  const files = [...mergeRows(byFile(base), byFile(local), byFile(saved),
    (file: LinkedFile) => file.name, conflicts).values()].map(({ listingId, ...file }) => {
    const listingIndex = listingId ? indexById.get(listingId) ?? null : null;
    if (listingId && listingIndex === null) {
      conflicts.add(file.name + " · removed product assignment");
      return { ...file, listingIndex, needsListingReview: true as const };
    }
    return { ...file, listingIndex };
  });
  const values = mergeObject(base.values, local.values, saved.values, field => conflicts.add(field.replaceAll("_", " ")));
  const draft = { ...local, values, listings: listings.map(([, listing]) => listing), files };
  return { draft, conflicts: [...conflicts] };
}
