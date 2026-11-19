"use client";

import { useEffect } from "react";
import { openEntriesAnchorId, type ActivityFilter } from "@/lib/account/activity";
import { readActivityViewReturn } from "@/lib/account/activity-view-return";

/** Every mobile activity tab lands at its filters; Open Entries also does so on desktop. */
export function MyActivityLandingScroll({ ownerId, filter, revealControls, enabled }: { ownerId?: string; filter: ActivityFilter; revealControls: boolean; enabled: boolean }) {
  useEffect(() => {
    const anchor = `#${openEntriesAnchorId}`;
    const normalize = () => {
      const hash = window.location.hash;
      if (hash !== anchor && hash.startsWith(anchor) && hash.split(anchor).every(part => part === "")) {
        window.history.replaceState(window.history.state, "", anchor);
      }
    };
    normalize();
    window.addEventListener("hashchange", normalize);
    return () => window.removeEventListener("hashchange", normalize);
  }, [filter]);
  useEffect(() => {
    if (!enabled || (filter !== "active" && filter !== "completion" && !window.matchMedia?.("(max-width: 767px)").matches)) return;
    if (ownerId && readActivityViewReturn(window.history.state, ownerId, window.location.href, filter)) return;

    // Allow the destination and Next's own navigation scroll to settle first.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(openEntriesAnchorId);
        if (!target) return;

        const headerBottom = (document.querySelector("header.sticky") ?? document.querySelector("header"))?.getBoundingClientRect().bottom ?? 0;
        const targetTop = window.scrollY + target.getBoundingClientRect().top - headerBottom - 12;
        const controls = revealControls ? document.getElementById("my-activity-empty-controls") : null;
        const controlsBottom = controls ? window.scrollY + controls.getBoundingClientRect().bottom - window.innerHeight + 16 : 0;
        const desktop = !window.matchMedia?.("(max-width: 767px)").matches;
        const focusOptions = filter === "completion" && window.location.hash.startsWith(`#${openEntriesAnchorId}`);
        if (focusOptions) {
          const option = target.querySelector<HTMLElement>('[data-filter="completion"]');
          option?.focus({ preventScroll: true });
          option?.scrollIntoView?.({ block: "center", behavior: "instant" });
        } else if (!desktop || filter === "active") window.scrollTo({ top: Math.max(0, targetTop, desktop ? controlsBottom : 0), behavior: "auto" });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [ownerId, filter, revealControls, enabled]);

  return null;
}
