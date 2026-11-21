export type CrewTab = "crew" | "requests" | "picks" | "groups" | "privacy" | "add";

export function isCrewTab(value: unknown): value is CrewTab {
  return value === "crew" || value === "requests" || value === "picks" || value === "groups" || value === "privacy" || value === "add";
}

export function parseCrewTab(value: string | null | undefined): CrewTab {
  return isCrewTab(value) ? value : "crew";
}

const crewAnchors: Record<CrewTab, string> = { crew: "crew-intro", groups: "crew-groups", picks: "sharing", privacy: "crew-privacy", requests: "", add: "crew-search" };

export function crewTabFromUrl(url: URL) {
  const values = [...new Set(url.searchParams.getAll("tab"))];
  if (values.length <= 1) return { tab: parseCrewTab(values[0]), invalid: values.length > 0 && !isCrewTab(values[0]) };
  const matching = values.find(value => isCrewTab(value) && crewAnchors[value] && url.hash === "#" + crewAnchors[value]);
  return { tab: parseCrewTab(matching), invalid: !matching };
}

export function crewTabHref(currentHref: string, tab: CrewTab): string {
  const url = new URL(currentHref);
  url.searchParams.set("tab", tab);
  // Replace the previous section's anchor while retaining invitation/member context.
  url.hash = crewAnchors[tab];
  return `${url.pathname}${url.search}${url.hash}`;
}
