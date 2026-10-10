/** Stable display reference for a prize pool, derived from its stored offering slug. */
export function prizeNumberForSlug(slug: string): string {
  let hash = 2166136261;
  for (let index = 0; index < slug.length; index += 1) {
    hash = Math.imul(hash ^ slug.charCodeAt(index), 16777619) >>> 0;
  }
  return `PRZ-${String(hash).padStart(10, "0")}`;
}
