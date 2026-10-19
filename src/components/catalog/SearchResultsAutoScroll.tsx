"use client";

import { useEffect } from "react";

/** Settle below the measured menu, including its closing search animation. */
export function SearchResultsAutoScroll({ searchKey }: { searchKey: string }) {
  useEffect(() => {
    if (!searchKey) return;
    let cancelled = false;
    let second = 0;
    const scroll = () => { if (!cancelled) document.getElementById("search-results")?.scrollIntoView?.({ block: "start", behavior: "auto" }); };
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(scroll); });
    const settle = setTimeout(scroll, 280);
    const stop = () => { cancelled = true; };
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      cancelled = true; cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle);
      window.removeEventListener("pointerdown", stop); window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", stop);
    };
  }, [searchKey]);
  return null;
}
