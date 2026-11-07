"use client";

import { useEffect } from "react";
import { openEntriesAnchorId, type ActivityFilter } from "@/lib/account/activity";
import { readActivityViewReturn } from "@/lib/account/activity-view-return";

/** Every mobile activity tab lands at its filters; Open Entries also does so on desktop. */
export function MyActivityLandingScroll({ ownerId, filter, revealControls, enabled }: { ownerId?: string; filter: ActivityFilter; revealControls: boolean; enabled: boolean }) {
  useEffect(() => {
    if (!enabled || (filter !== "active" && !window.matchMedia?.("(max-width: 767px)").matches)) return;
    if (ownerId && readActivityViewReturn(window.history.state, ownerId, window.location.href, filter)) return;

    // Allow the destination and Next's own navigation scroll to settle first.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(openEntriesAnchorId);
        if (!target) return;

        const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
        const targetTop = window.scrollY + target.getBoundingClientRect().top - headerBottom - 12;
        const controls = revealControls ? document.getElementById("my-activity-empty-controls") : null;
        const controlsBottom = controls ? window.scrollY + controls.getBoundingClientRect().bottom - window.innerHeight + 16 : 0;
        window.scrollTo({ top: Math.max(0, targetTop, controlsBottom), behavior: "auto" });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [ownerId, filter, revealControls, enabled]);

  return null;
}
