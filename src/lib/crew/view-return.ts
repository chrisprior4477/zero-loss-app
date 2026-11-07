export const crewViewReturnKey = "zeroLossCrewViewReturn";

export type CrewViewReturn = {
  ownerId: string; href: string; selectedKey: string; pickSlug: string;
  peopleLeft: number; picksLeft: number; scrollY: number;
};

/** A bookmark for this exact browser history entry, never a record of a member's shared data. */
export function readCrewViewReturn(state: unknown, ownerId: string, href: string): CrewViewReturn | null {
  if (!state || typeof state !== "object") return null;
  const saved = (state as Record<string, unknown>)[crewViewReturnKey] as Partial<CrewViewReturn> | undefined;
  if (!saved || saved.ownerId !== ownerId || saved.href !== href || typeof saved.selectedKey !== "string"
    || typeof saved.pickSlug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(saved.pickSlug)
    || ![saved.peopleLeft, saved.picksLeft, saved.scrollY].every(value => typeof value === "number" && Number.isFinite(value) && value >= 0)) return null;
  return saved as CrewViewReturn;
}
