"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { crewTabFromUrl, crewTabHref, type CrewTab } from "@/lib/crew/navigation";
import { revealBelowHeader } from "@/lib/account/landing-position";

const sectionChanged = "zero-loss-crew-section";
function subscribe(onChange: () => void) {
  const events = ["popstate", "hashchange", "pageshow", sectionChanged];
  events.forEach(name => window.addEventListener(name, onChange));
  return () => events.forEach(name => window.removeEventListener(name, onChange));
}

export function rememberCrewSectionFocus(element: HTMLElement | null) {
  if (!element?.id || window.location.pathname !== "/account/crew") return;
  window.history.replaceState({ ...window.history.state, zeroLossCrewSectionFocus: { href: window.location.href, id: element.id } }, "");
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
    const timers: number[] = [];
    function cancelRestore() {
      cancelAnimationFrame(frame);
      timers.splice(0).forEach(clearTimeout);
    }
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
      cancelRestore();
      const saved = window.history.state?.zeroLossCrewSectionFocus;
      const bookmarkedId = saved?.href === url.href && typeof saved.id === "string" ? saved.id : null;
      function align() {
        if (window.location.href !== url.href) return;
        const active = document.activeElement;
        if (active !== document.body && !active?.matches("[data-crew-tab], #crew-tabs, #my-shared-picks-heading")) return;
        const exact = bookmarkedId ? document.getElementById(bookmarkedId) : null;
        const target = exact?.getClientRects().length ? exact : document.querySelector<HTMLElement>('[data-crew-tab="' + next + '"]');
        target?.focus({ preventScroll: true });
        if (target) revealBelowHeader(target);
      }
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(align); });
      if (bookmarkedId) for (const delay of [120, 400, 850]) timers.push(window.setTimeout(align, delay));
    }
    restore();
    const interactions = ["pointerdown", "keydown", "wheel"];
    interactions.forEach(name => window.addEventListener(name, cancelRestore, { passive: true }));
    window.addEventListener("popstate", restore);
    return () => {
      cancelRestore();
      window.removeEventListener("popstate", restore);
      interactions.forEach(name => window.removeEventListener(name, cancelRestore));
    };
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
