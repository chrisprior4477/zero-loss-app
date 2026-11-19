"use client";

import { useLayoutEffect } from "react";

type BrowseFocusTarget = "heading" | "ticket-range" | "first-prize" | "product-request";
let requestedFocus: { href: string; target: BrowseFocusTarget } | null = null;

function focusBrowseResults(target: BrowseFocusTarget) {
  const destination = target === "ticket-range"
    ? document.querySelector<HTMLElement>('[aria-label="Tickets remaining"] [aria-current="true"]')
    : target === "first-prize" ? document.querySelector<HTMLElement>("article[id^=prize-]")
    : target === "product-request" ? document.getElementById("request-a-product") : null;
  const targetElement = destination ?? document.getElementById("grocery-inspiration-heading") ?? document.getElementById("browse-results-heading");
  if (destination && (target === "first-prize" || target === "product-request")) destination.scrollIntoView?.({ block: "start", behavior: "instant" });
  targetElement?.focus({ preventScroll: true });
}

export function requestBrowseResultsFocus(href: string, target: BrowseFocusTarget = "heading") {
  const request = { href, target };
  requestedFocus = request;
  // Choosing the current category can leave the existing page mounted.
  const destination = new URL(href, window.location.origin);
  if (window.location.pathname !== destination.pathname || window.location.search !== destination.search) return;
  requestAnimationFrame(() => {
    if (requestedFocus !== request) return;
    requestedFocus = null;
    focusBrowseResults(target);
  });
}

/** Settle the requested browse destination below the menu's closing animation. */
export function SearchResultsAutoScroll({ searchKey, mobileBrowseKey = "", groceryKey = "", invalidSearch = false }: { searchKey: string; mobileBrowseKey?: string; groceryKey?: string; invalidSearch?: boolean }) {
  useLayoutEffect(() => {
    let cancelled = false;
    let first = 0;
    let second = 0;
    let settle: ReturnType<typeof setTimeout>;
    const start = () => {
      cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle);
      const mobileBrowse = mobileBrowseKey && window.matchMedia?.("(max-width: 1023px)").matches;
      // A prefetched Browse URL can point to the results and the exact prize in one fragment.
      const anchors = window.location.hash.slice(1).split("#");
      const footerAnchor = anchors.find(anchor => anchor === "ending-soon-search-input" || anchor === "browse-search-input");
      if (anchors.length > 1 && footerAnchor && document.getElementById(footerAnchor)) {
        window.history.replaceState(window.history.state, "", `#${footerAnchor}`);
      } else if (anchors.length > 1 && anchors.includes("search-results")) {
        const prize = anchors.find(anchor => anchor.startsWith("prize-") && document.getElementById(anchor));
        if (prize || anchors.every(anchor => anchor === "search-results" || anchor.startsWith("prize-"))) {
          window.history.replaceState(window.history.state, "", `#${prize ?? "search-results"}`);
        }
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
      const focusResults = requestedFocus && window.location.href === new URL(requestedFocus.href, window.location.origin).href ? requestedFocus.target : null;
      requestedFocus = null;
      const invalidSearchInput = invalidSearch ? document.querySelector<HTMLInputElement>('#search-results form[role="search"] input[type="search"]') : null;
      const focusTarget = footerField ?? invalidSearchInput ?? (target.startsWith("prize-") && new URLSearchParams(window.location.search).has("batch")
        ? document.getElementById(target) : null);
      let focused = false;
      const scroll = () => {
        if (cancelled) return;
        if (!focused || (focusResults !== "first-prize" && focusResults !== "product-request")) {
          document.getElementById(target)?.scrollIntoView?.({ block: "start", behavior: "instant" });
        }
        if ((focusTarget || focusResults) && !focused) {
          focused = true;
          if (focusTarget) focusTarget.focus({ preventScroll: true });
          else if (focusResults) focusBrowseResults(focusResults);
        }
      };
      scroll();
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
  }, [searchKey, mobileBrowseKey, groceryKey, invalidSearch]);
  return null;
}
