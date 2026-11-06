export type CrewTab = "crew" | "requests" | "picks" | "groups" | "privacy" | "add";

export function parseCrewTab(value: string | null | undefined): CrewTab {
  return value === "requests" || value === "picks" || value === "groups" || value === "privacy" || value === "add" ? value : "crew";
}

export function crewTabHref(currentHref: string, tab: CrewTab): string {
  const url = new URL(currentHref);
  url.searchParams.set("tab", tab);
  // Replace the previous section's anchor while retaining invitation/member context.
  url.hash = ({ crew: "crew-intro", groups: "crew-groups", picks: "sharing", privacy: "crew-privacy", requests: "", add: "crew-intro" })[tab];
  return `${url.pathname}${url.search}${url.hash}`;
}
