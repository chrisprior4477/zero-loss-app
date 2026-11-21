"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { crewTabFromUrl, crewTabHref, type CrewTab } from "@/lib/crew/navigation";

const sectionChanged = "zero-loss-crew-section";
function subscribe(onChange: () => void) {
  const events = ["popstate", "hashchange", "pageshow", sectionChanged];
  events.forEach(name => window.addEventListener(name, onChange));
  return () => events.forEach(name => window.removeEventListener(name, onChange));
}

/** Section navigation is bookmarkable without reloading the mounted Crew editors. */
export function useCrewTab(initialTab: CrewTab) {
  const tab = useSyncExternalStore(subscribe,
    () => crewTabFromUrl(new URL(window.location.href)).tab,
    () => initialTab);

  const [invalidTab, setInvalidTab] = useState(false);
  const lastTab = useRef(initialTab);
  useEffect(() => {
    let frame = 0;
    function restore(event?: Event) {
      const url = new URL(window.location.href);
      const { tab: next, invalid } = crewTabFromUrl(url);
      const changed = lastTab.current !== next;
      lastTab.current = next;
      if (invalid) {
        url.searchParams.delete("tab");
        window.history.replaceState({ ...window.history.state, zeroLossCrewInvalidTab: true }, "", url);
      } else if (url.searchParams.getAll("tab").length > 1) {
        url.searchParams.set("tab", next);
        window.history.replaceState(window.history.state, "", url);
      }
      setInvalidTab(invalid || window.history.state?.zeroLossCrewInvalidTab === true);
      if (event?.type !== "popstate" || !changed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.activeElement === document.body) {
          document.querySelector<HTMLElement>('[data-crew-tab="' + next + '"]')?.focus({ preventScroll: true });
        }
      });
    }
    restore();
    window.addEventListener("popstate", restore);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("popstate", restore); };
  }, []);

  function selectTab(nextTab: CrewTab) {
    lastTab.current = nextTab;
    setInvalidTab(false);
    if (crewTabFromUrl(new URL(window.location.href)).tab === nextTab && !invalidTab) return;
    // Next's native-history integration retains its routing state. A new entry
    // lets Back/Forward revisit sections without saving any account preferences.
    window.history.pushState(null, "", crewTabHref(window.location.href, nextTab));
    window.dispatchEvent(new Event(sectionChanged));
  }
  return { tab: tab === "add" ? "crew" : tab, selectTab, invalidTab };
}
