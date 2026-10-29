"use client";

import { useEffect } from "react";

/** Exact-order links land on the selected record below the sticky site header. */
export function SelectedOrderScroll({ targetId }: { targetId: string }) {
  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (!target) return;
        const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
        const top = window.scrollY + target.getBoundingClientRect().top - headerBottom - 12;
        window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [targetId]);

  return null;
}
