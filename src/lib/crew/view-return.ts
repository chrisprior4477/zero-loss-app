export const crewViewReturnKey = "zeroLossCrewViewReturn";

/** A navigation hint only. The destination still checks current Crew membership. */
export function crewPickReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500 || !value.startsWith("/account/crew?") || /[\\\s\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value, "https://zeroloss.local");
    const keys = [...url.searchParams.keys()];
    if (url.pathname !== "/account/crew" || (url.hash && url.hash !== "#crew-intro") || keys.length !== 2 || new Set(keys).size !== 2
      || keys.some(key => key !== "member" && key !== "pick")
      || !/^[a-zA-Z0-9_-]{1,80}$/.test(url.searchParams.get("member") ?? "")
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.searchParams.get("pick") ?? "")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

export function crewPickHref(selectedKey: string, pickSlug: string): string {
  // The gallery positions the chosen pick itself. Avoid a competing hash scroll,
  // including Next's cached-navigation handling of an already visited anchor.
  return `/account/crew?${new URLSearchParams({ member: selectedKey, pick: pickSlug })}`;
}

export function readCrewPickDestination(href: string): { selectedKey: string; pickSlug: string } | null {
  const url = new URL(href);
  return crewPickReturnPath(`${url.pathname}${url.search}${url.hash}`)
    ? { selectedKey: url.searchParams.get("member")!, pickSlug: url.searchParams.get("pick")! } : null;
}

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
