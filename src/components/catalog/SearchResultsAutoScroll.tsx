"use client";

import { useLayoutEffect } from "react";

type BrowseFocusTarget = "heading" | "ticket-range" | "first-prize" | "product-request";
let requestedFocus: { href: string; target: BrowseFocusTarget; expires: number } | null = null;

function takeBrowseFocus() {
  if (!requestedFocus) return null;
  if (requestedFocus.expires < Date.now()) { requestedFocus = null; return null; }
  const destination = new URL(requestedFocus.href, window.location.origin);
  const current = new URL(window.location.href);
  destination.searchParams.sort();
  current.searchParams.sort();
  if (current.pathname !== destination.pathname || current.search !== destination.search
    || (destination.hash && current.hash && current.hash !== destination.hash)) return null;
  const target = requestedFocus.target;
  requestedFocus = null;
  return target;
}

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
  const request = { href, target, expires: Date.now() + 5000 };
  requestedFocus = request;
  // Choosing the current category can leave the existing page mounted.
  const destination = new URL(href, window.location.origin);
  if (window.location.pathname !== destination.pathname || window.location.search !== destination.search) return;
  requestAnimationFrame(() => {
    if (requestedFocus !== request) return;
    const next = takeBrowseFocus();
    if (next) focusBrowseResults(next);
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
      const missingPrize = /^prize-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(hashId) && !document.getElementById(hashId);
      if (missingPrize) window.history.replaceState(window.history.state, "", "#search-results");
      const footerField = hashId === "browse-search-input" || hashId === "ending-soon-search-input"
        ? document.getElementById(hashId) : null;
      const footerHeading = footerField ? hashId.replace(/-input$/, "-again") : null;
      const target = window.location.hash === "#browse-more-prizes" ? "browse-more-prizes"
        : window.location.hash === "#retailer-categories-heading"
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
      let focusResults: BrowseFocusTarget | null = null;
      const invalidSearchInput = invalidSearch ? document.querySelector<HTMLInputElement>('#search-results form[role="search"] input[type="search"]') : null;
      const focusTarget = footerField ?? invalidSearchInput ?? (target === "browse-more-prizes" ? document.getElementById(target) : null) ?? (missingPrize ? document.getElementById("browse-results-heading") : null) ?? (target.startsWith("prize-") && new URLSearchParams(window.location.search).has("batch")
        ? document.getElementById(target) : null);
      let focused = false;
      const scroll = () => {
        if (cancelled) return;
        if (!focused) focusResults = takeBrowseFocus() ?? focusResults;
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
    window.addEventListener("popstate", start);
    const stop = () => { cancelled = true; };
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      cancelled = true; cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle);
      window.removeEventListener("hashchange", start);
      window.removeEventListener("popstate", start);
      window.removeEventListener("pointerdown", stop); window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", stop);
    };
  }, [searchKey, mobileBrowseKey, groceryKey, invalidSearch]);
  return null;
}
