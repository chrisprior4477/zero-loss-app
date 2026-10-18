"use client";

import { useEffect } from "react";

/** Bring the actionable pass below the mobile sticky header on reward arrival. */
export function RewardPassAutoScroll({ rewardKey }: { rewardKey: string }) {
  useEffect(() => {
    if (!window.matchMedia?.("(max-width: 700px)").matches) return;

    // Let the destination layout and Next's navigation scroll settle first.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        document.getElementById("reward-pass")?.scrollIntoView({ block: "start", behavior: "auto" });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [rewardKey]);

  return null;
}
