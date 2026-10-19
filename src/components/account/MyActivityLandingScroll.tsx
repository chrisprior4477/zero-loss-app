"use client";

import { useEffect } from "react";
import type { ActivityFilter } from "@/lib/account/activity";

/** Keep the selected activity and its next actions in view on small phones. */
export function MyActivityLandingScroll({ filter, revealControls, enabled }: { filter: ActivityFilter; revealControls: boolean; enabled: boolean }) {
  useEffect(() => {
    if (!enabled || !window.matchMedia?.("(max-width: 600px)").matches) return;

    // Allow the destination and Next's own navigation scroll to settle first.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const heading = document.getElementById("my-activity-heading");
        if (!heading) return;

        const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
        const headingTop = window.scrollY + heading.getBoundingClientRect().top - headerBottom - 12;
        const controls = revealControls ? document.getElementById("my-activity-empty-controls") : null;
        const controlsBottom = controls ? window.scrollY + controls.getBoundingClientRect().bottom - window.innerHeight + 16 : 0;
        window.scrollTo({ top: Math.max(0, headingTop, controlsBottom), behavior: "auto" });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [filter, revealControls, enabled]);

  return null;
}
