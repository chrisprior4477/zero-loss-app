"use client";

import { useEffect } from "react";

/** Settle the requested browse destination below the menu's closing animation. */
export function SearchResultsAutoScroll({ searchKey, mobileBrowseKey = "", groceryKey = "" }: { searchKey: string; mobileBrowseKey?: string; groceryKey?: string }) {
  useEffect(() => {
    let cancelled = false;
    let first = 0;
    let second = 0;
    let settle: ReturnType<typeof setTimeout>;
    const start = () => {
      cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle);
      const mobileBrowse = mobileBrowseKey && window.matchMedia?.("(max-width: 1023px)").matches;
      // Next.js can repeat the anchor when navigating to a prefetched Browse URL.
      if (/^(?:#search-results){2,}$/.test(window.location.hash)) {
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#search-results`);
      }
      const hashId = window.location.hash.slice(1);
      const footerField = hashId === "browse-search-input" || hashId === "ending-soon-search-input"
        ? document.getElementById(hashId) : null;
      const footerHeading = footerField ? hashId.replace(/-input$/, "-again") : null;
      const target = window.location.hash === "#retailer-categories-heading"
        ? "retailer-categories-heading"
        : footerHeading ? footerHeading
        : window.location.hash === "#ending-soon-search-again" && document.getElementById("ending-soon-search-again") ? "ending-soon-search-again"
        : window.location.hash === "#browse-search-again" && document.getElementById("browse-search-again") ? "browse-search-again"
        : window.location.hash.startsWith("#prize-") && document.getElementById(window.location.hash.slice(1)) ? window.location.hash.slice(1)
        : window.location.hash === "#more-groceries" ? "more-groceries"
          : groceryKey && (!window.location.hash || window.location.hash.startsWith("#search-results") || window.location.hash === "#grocery-inspiration") ? "grocery-inspiration"
            : searchKey || mobileBrowse || window.location.hash === "#search-results" ? "search-results" : null;
      if (!target) return;
      cancelled = false;
      const focusTarget = footerField ?? (target.startsWith("prize-") && new URLSearchParams(window.location.search).has("batch")
        ? document.getElementById(target) : null);
      let focused = false;
      const scroll = () => {
        if (cancelled) return;
        document.getElementById(target)?.scrollIntoView?.({ block: "start", behavior: "auto" });
        if (focusTarget && !focused) {
          focused = true;
          focusTarget.focus({ preventScroll: true });
        }
      };
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
  }, [searchKey, mobileBrowseKey, groceryKey]);
  return null;
}
