"use client";

import { useSyncExternalStore } from "react";
import { crewTabHref, parseCrewTab, type CrewTab } from "@/lib/crew/navigation";

const sectionChanged = "zero-loss-crew-section";
function subscribe(onChange: () => void) {
  const events = ["popstate", "hashchange", "pageshow", sectionChanged];
  events.forEach(name => window.addEventListener(name, onChange));
  return () => events.forEach(name => window.removeEventListener(name, onChange));
}

/** Section navigation is bookmarkable without reloading the mounted Crew editors. */
export function useCrewTab(initialTab: CrewTab) {
  const tab = useSyncExternalStore(subscribe,
    () => parseCrewTab(new URLSearchParams(window.location.search).get("tab")),
    () => initialTab);

  function selectTab(nextTab: CrewTab) {
    if (parseCrewTab(new URLSearchParams(window.location.search).get("tab")) === nextTab) return;
    // Next's native-history integration retains its routing state. A new entry
    // lets Back/Forward revisit sections without saving any account preferences.
    window.history.pushState(null, "", crewTabHref(window.location.href, nextTab));
    window.dispatchEvent(new Event(sectionChanged));
  }
  return { tab: tab === "add" ? "crew" : tab, selectTab };
}
