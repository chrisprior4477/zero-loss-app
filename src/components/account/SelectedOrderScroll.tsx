"use client";

import { useEffect } from "react";

/** Land below the sticky header, including older links with a duplicated fragment. */
export function SelectedOrderScroll({ targetId, onlyIfRepeated = false }: { targetId: string; onlyIfRepeated?: boolean }) {
  useEffect(() => {
    const hash = `#${targetId}`;
    const currentHash = window.location.hash;
    const repeated = currentHash !== hash && currentHash.startsWith(hash) && currentHash.split(hash).every(part => part === "");
    if (onlyIfRepeated && !repeated) return;
    if (repeated) window.history.replaceState(window.history.state, "", hash);
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
  }, [targetId, onlyIfRepeated]);

  return null;
}
