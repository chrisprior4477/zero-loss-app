"use client";

import { useEffect } from "react";
import { readCrewPickDestination, readCrewViewReturn } from "@/lib/crew/view-return";

/** Mobile Crew visits start at the heading, without overriding request or sharing links. */
export function CrewLandingScroll({ enabled, ownerId, groups = false }: { enabled: boolean; ownerId?: string; groups?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const cancel = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
    const hash = groups ? "#crew-groups" : "#crew-intro";
    const target = groups ? "groups-title" : "crew-intro";
    const canScroll = () => (groups || window.matchMedia?.("(max-width: 767px)").matches)
      && (!window.location.hash || window.location.hash === hash);
    const revealCrew = () => {
      cancel();
      if (!canScroll() || readCrewPickDestination(window.location.href) || ownerId && readCrewViewReturn(window.history.state, ownerId, window.location.href)) return;
      // Wait for the menu to close and the chosen sticky header to finish measuring.
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (!canScroll()) return;
          const heading = document.getElementById(target);
          if (!heading) return;
          const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
          window.scrollTo({ top: Math.max(0, window.scrollY + heading.getBoundingClientRect().top - headerBottom - 12), behavior: "auto" });
          if (groups && document.activeElement === document.body) heading.focus({ preventScroll: true });
        });
      });
    };
    revealCrew();
    window.addEventListener("hashchange", revealCrew);
    return () => { cancel(); window.removeEventListener("hashchange", revealCrew); };
  }, [enabled, ownerId, groups]);
  return null;
}
