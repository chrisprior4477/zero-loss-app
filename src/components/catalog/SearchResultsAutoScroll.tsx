"use client";

import { useEffect } from "react";

/** Settle the requested browse destination below the menu's closing animation. */
export function SearchResultsAutoScroll({ searchKey, mobileBrowseKey = "" }: { searchKey: string; mobileBrowseKey?: string }) {
  useEffect(() => {
    let cancelled = false;
    let first = 0;
    let second = 0;
    let settle: ReturnType<typeof setTimeout>;
    const start = () => {
      cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle);
      const mobileBrowse = mobileBrowseKey && window.matchMedia?.("(max-width: 1023px)").matches;
      const target = window.location.hash === "#retailer-categories-heading"
        ? "retailer-categories-heading"
        : searchKey || mobileBrowse || window.location.hash === "#search-results" ? "search-results" : null;
      if (!target) return;
      cancelled = false;
      const scroll = () => { if (!cancelled) document.getElementById(target)?.scrollIntoView?.({ block: "start", behavior: "auto" }); };
      first = requestAnimationFrame(() => { second = requestAnimationFrame(scroll); });
      settle = setTimeout(scroll, 280);
    };
    start();
    window.addEventListener("hashchange", start);
    const stop = () => { cancelled = true; };
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      cancelled = true; cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle);
      window.removeEventListener("hashchange", start);
      window.removeEventListener("pointerdown", stop); window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", stop);
    };
  }, [searchKey, mobileBrowseKey]);
  return null;
}
