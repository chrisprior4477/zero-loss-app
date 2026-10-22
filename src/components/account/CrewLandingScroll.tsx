"use client";

import { useEffect } from "react";

/** Mobile Crew visits start at the heading, without overriding request or sharing links. */
export function CrewLandingScroll({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const cancel = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
    const canScroll = () => window.matchMedia?.("(max-width: 767px)").matches
      && (!window.location.hash || window.location.hash === "#crew-intro");
    const revealCrew = () => {
      cancel();
      if (!canScroll()) return;
      // Wait for the menu to close and the chosen sticky header to finish measuring.
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (!canScroll()) return;
          const heading = document.getElementById("crew-intro");
          if (!heading) return;
          const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
          window.scrollTo({ top: Math.max(0, window.scrollY + heading.getBoundingClientRect().top - headerBottom - 12), behavior: "auto" });
        });
      });
    };
    revealCrew();
    window.addEventListener("hashchange", revealCrew);
    return () => { cancel(); window.removeEventListener("hashchange", revealCrew); };
  }, [enabled]);
  return null;
}
