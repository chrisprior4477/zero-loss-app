type SavedEntry = { entryId?: string | null; enteredAt?: string | null };

function enteredTime(value: string | null | undefined): number {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

/** Keep numbered tickets consistent across entry details and notification stacks. */
export function compareSavedEntries(left: SavedEntry, right: SavedEntry): number {
  return enteredTime(left.enteredAt) - enteredTime(right.enteredAt)
    || (left.entryId ?? "").localeCompare(right.entryId ?? "");
}
