"use client";

import { useEffect } from "react";

/** Focus the selected pass and bring it below the sticky header on mobile. */
export function RewardPassAutoScroll({ rewardKey }: { rewardKey: string }) {
  useEffect(() => {
    // Let the destination layout and Next's navigation scroll settle first.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (window.matchMedia?.("(max-width: 700px)").matches) {
          document.getElementById("reward-pass")?.scrollIntoView({ block: "start", behavior: "auto" });
        }
        if (document.activeElement === document.body || document.activeElement?.tagName === "MAIN") {
          document.getElementById("reward-pass-title")?.focus({ preventScroll: true });
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [rewardKey]);

  return null;
}
