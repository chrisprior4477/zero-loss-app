"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { hasAccountHistoryReturn } from "@/components/account/AccountHistoryReturn";

type BrowseFocusTarget = "heading" | "top-search" | "ticket-range" | "first-prize" | "product-request" | "categories-top" | "categories-bottom";
let requestedFocus: { href: string; target: BrowseFocusTarget; expires: number } | null = null;
let categoryDeparture: { href: string; target: "categories-top" | "categories-bottom" } | null = null;
const filterReturnKey = "zeroLossBrowseFilterReturn";

export function rememberBrowseLowerTrigger(panel: "filters" | "categories", top?: number) {
  window.history.replaceState({
    ...window.history.state,
    [filterReturnKey]: { href: location.href, top, panel },
  }, "");
}

export function forgetBrowseLowerTrigger() {
  if (!window.history.state?.[filterReturnKey]) return;
  const state = { ...window.history.state };
  delete state[filterReturnKey];
  window.history.replaceState(state, "");
}

export function rememberBrowseCategoryTrigger(position: "top" | "bottom") {
  categoryDeparture = { href: window.location.href, target: position === "bottom" ? "categories-bottom" : "categories-top" };
}

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
    : target === "top-search" ? document.querySelector<HTMLInputElement>('#search-results form[role="search"] input[type="search"]')
    : target === "first-prize" ? document.querySelector<HTMLElement>("article[id^=prize-]")
    : target === "product-request" ? document.getElementById("request-a-product")
    : target === "categories-top" || target === "categories-bottom" ? document.querySelector<HTMLElement>(`[data-browse-categories="${target.slice(11)}"]`) : null;
  const targetElement = destination ?? document.getElementById("grocery-inspiration-heading") ?? document.getElementById("browse-results-heading");
  if (destination && (target === "first-prize" || target === "product-request")) destination.scrollIntoView?.({ block: "start", behavior: "instant" });
  targetElement?.focus({ preventScroll: true });
  if (destination && (target === "categories-top" || target === "categories-bottom")) revealBelowHeader(destination);
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
type ScrollProps = {
  searchKey: string;
  mobileBrowseKey?: string;
  groceryKey?: string;
  invalidSearch?: boolean;
  obsoleteBatch?: boolean;
  focusObsoleteBatch?: boolean;
  normalizedBatch?: string | null;
  invalidTicketRange?: boolean;
  invalidType?: boolean;
  normalizeAvailability?: boolean;
  availableOnly?: boolean;
  invalidSubcategory?: boolean;
  invalidGroceryIdea?: boolean;
  duplicateSelectors?: boolean;
  conflictingSearch?: boolean;
  conflictingFilters?: string;
  oldTailPrizes?: string[];
  batchSize?: number;
};

export function SearchResultsAutoScroll({
  searchKey, mobileBrowseKey = "", groceryKey = "", invalidSearch = false,
  obsoleteBatch, focusObsoleteBatch, normalizedBatch, invalidTicketRange, invalidType, normalizeAvailability, availableOnly,
  invalidSubcategory, invalidGroceryIdea, duplicateSelectors, conflictingSearch, conflictingFilters, oldTailPrizes, batchSize = 24,
}: ScrollProps) {
  const router = useRouter();
  useLayoutEffect(() => {
    if (window.location.pathname !== "/browse" || !(obsoleteBatch || invalidTicketRange || invalidType || normalizeAvailability || invalidSubcategory || invalidGroceryIdea || duplicateSelectors)) return;
    const url = new URL(window.location.href);
    const selected = url.hash.startsWith("#prize-") ? oldTailPrizes?.indexOf(url.hash.slice(7)) ?? -1 : -1;
    const tail = oldTailPrizes && selected >= 0 ? Math.floor((oldTailPrizes.length - selected - 1) / batchSize) + 1 : null;
    if (duplicateSelectors) for (const name of new Set(url.searchParams.keys())) {
      if (name === "q" && conflictingSearch || conflictingFilters?.split(",").includes(name)) continue;
      if (url.searchParams.getAll(name).length > 1) url.searchParams.set(name, url.searchParams.get(name)!);
    }
    if (invalidSubcategory) url.searchParams.delete("subcategory");
    if (invalidGroceryIdea) {
      url.searchParams.delete("groceryIdea");
      if (url.hash === "#more-groceries" && !document.getElementById("more-groceries")) url.hash = "#search-results";
    }
    if (obsoleteBatch) {
      const nextBatch = tail === null ? normalizedBatch : oldTailPrizes!.length <= batchSize ? null : tail === 1 ? "last" : `last-${tail}`;
      if (nextBatch) url.searchParams.set("batch", nextBatch);
      else url.searchParams.delete("batch");
    }
    if (invalidTicketRange) url.searchParams.delete("ticketsLeft");
    if (invalidType) url.searchParams.delete("type");
    if (normalizeAvailability) {
      if (availableOnly) url.searchParams.set("available", "1");
      else url.searchParams.delete("available");
    }
    if (url.href === window.location.href) return;
    if (tail === null) window.history.replaceState(window.history.state, "", url.href);
    else router.replace(url.pathname + url.search + url.hash, { scroll: false });
  }, [mobileBrowseKey, obsoleteBatch, normalizedBatch, invalidTicketRange, invalidType, normalizeAvailability, availableOnly, invalidSubcategory, invalidGroceryIdea, duplicateSelectors, conflictingSearch, conflictingFilters, oldTailPrizes, batchSize, router]);

  useLayoutEffect(() => {
    let cancelled = false;
    let first = 0;
    let second = 0;
    let settle: ReturnType<typeof setTimeout>;
    const renderedSearch = window.location.search;
    const start = (event?: Event) => {
      cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle);
      if (hasAccountHistoryReturn() && !requestedFocus) return;
      const filter = window.history.state?.[filterReturnKey];
      const lowerTrigger = !requestedFocus && filter?.href === location.href
        ? document.querySelector<HTMLElement>(filter.panel === "categories" ? '[data-browse-categories="bottom"]' : '[data-browse-filter="bottom"]') : null;
      if (lowerTrigger?.getClientRects().length) {
        cancelled = false;
        const restoreLowerTrigger = () => {
          if (cancelled || location.href !== filter.href || !lowerTrigger.isConnected
            || document.querySelector("dialog[open]")) return;
          if (Number.isFinite(filter.top)) window.scrollTo({ top: filter.top, behavior: "instant" });
          lowerTrigger.focus({ preventScroll: true });
          revealBelowHeader(lowerTrigger);
        };
        first = requestAnimationFrame(() => { second = requestAnimationFrame(restoreLowerTrigger); });
        settle = setTimeout(restoreLowerTrigger, 280);
        return;
      }
      const category = categoryDeparture;
      if (category?.href === window.location.href) {
        cancelled = false;
        const restoreCategory = () => {
          if (cancelled || location.href !== category.href) return;
          focusBrowseResults(category.target);
        };
        first = requestAnimationFrame(() => { second = requestAnimationFrame(restoreCategory); });
        settle = setTimeout(() => {
          restoreCategory();
          if (categoryDeparture === category) categoryDeparture = null;
        }, 280);
        return;
      }
      const search = window.history.state?.zeroLossBrowseSearchReturn;
      const searchField = search?.href === location.href && Number.isFinite(search.top)
        && ["browse-search-input", "ending-soon-search-input"].includes(search.input)
        ? document.getElementById(search.input) : null;
      if (searchField) {
        cancelled = false;
        const restoreSearch = () => {
          if (cancelled || location.href !== search.href || !searchField.isConnected) return;
          window.scrollTo({ top: search.top, behavior: "instant" });
          searchField.focus({ preventScroll: true });
          const header = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
          const field = searchField.getBoundingClientRect();
          if (field.top < header || field.bottom > innerHeight) revealBelowHeader(searchField);
        };
        first = requestAnimationFrame(() => { second = requestAnimationFrame(restoreSearch); });
        settle = setTimeout(restoreSearch, 280);
        return;
      }
      const favorite = window.history.state?.zeroLossBrowseFavoriteReturn;
      if (favorite?.href === window.location.href && typeof favorite.slug === "string"
        && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(favorite.slug) && Number.isFinite(favorite.top)) {
        const heart = document.querySelector<HTMLElement>(`main [data-favorite-product="${favorite.slug}"]`);
        if (heart) {
          cancelled = false;
          const restore = () => {
            if (cancelled || window.location.href !== favorite.href || !heart.isConnected) return;
            heart.focus({ preventScroll: true });
            window.scrollTo({ top: favorite.top, behavior: "instant" });
          };
          first = requestAnimationFrame(() => { second = requestAnimationFrame(restore); });
          settle = setTimeout(() => {
            restore();
            if (window.history.state?.zeroLossBrowseFavoriteReturn?.href !== favorite.href) return;
            const next = { ...window.history.state };
            delete next.zeroLossBrowseFavoriteReturn;
            window.history.replaceState(next, "");
          }, 450);
          return;
        }
      }
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
      if (oldTailPrizes?.includes(hashId.slice(6)) && !document.getElementById(hashId)) return;
      const missingPrize = /^prize-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(hashId) && !document.getElementById(hashId);
      if (missingPrize) window.history.replaceState(window.history.state, "", "#search-results");
      const footerField = hashId === "browse-search-input" || hashId === "ending-soon-search-input"
        ? document.getElementById(hashId) : null;
      const footerHeading = footerField ? hashId.replace(/-input$/, "-again") : null;
      const control = /^#(browse-clear-filters|browse-recovery-(?:price|categories|any-value)|browse-more-prizes|ending-first-last|ending-next-prizes|ending-previous-prizes)$/.exec(window.location.hash)?.[1];
      const target = control ? control
        : window.location.hash === "#retailer-categories-heading"
        ? "retailer-categories-heading"
        : footerHeading ? footerHeading
        : window.location.hash === "#ending-soon-search-again" && document.getElementById("ending-soon-search-again") ? "ending-soon-search-again"
        : window.location.hash === "#browse-search-again" && document.getElementById("browse-search-again") ? "browse-search-again"
        : window.location.hash.startsWith("#prize-") && document.getElementById(window.location.hash.slice(1)) ? window.location.hash.slice(1)
        : window.location.hash === "#more-groceries" ? "more-groceries"
          : groceryKey && (!window.location.hash || window.location.hash.startsWith("#search-results") || window.location.hash === "#grocery-inspiration") ? "grocery-inspiration"
            : searchKey || mobileBrowse || focusObsoleteBatch || window.location.hash === "#search-results" ? "search-results" : null;
      if (!target) return;
      cancelled = false;
      let focusResults: BrowseFocusTarget | null = null;
      const invalidSearchInput = invalidSearch ? document.querySelector<HTMLInputElement>('#search-results form[role="search"] input[type="search"]') : null;
      const groceryNotice = invalidGroceryIdea ? document.getElementById("unavailable-grocery-idea") : null;
      if (event?.type === "popstate" && window.location.pathname === "/browse") {
        if (window.location.hash === "#search-results" && window.location.search !== renderedSearch) {
          requestedFocus = { href: window.location.href, target: "heading", expires: Date.now() + 5000 };
        }
      }
      const focusTarget = groceryNotice ?? footerField ?? invalidSearchInput ?? (control ? document.getElementById(target) : null) ?? (missingPrize || focusObsoleteBatch && target === "search-results" ? document.getElementById("browse-results-heading") : null) ?? (target.startsWith("prize-")
        ? document.getElementById(target) : null);
      let focused = false;
      const scroll = () => {
        if (cancelled) return;
        if (!focused && window.location.search === renderedSearch) focusResults = takeBrowseFocus() ?? focusResults;
        if (!groceryNotice && (!focused || (focusResults !== "first-prize" && focusResults !== "product-request" && focusResults !== "categories-top" && focusResults !== "categories-bottom"))) {
          const element = document.getElementById(target);
          if (element && (target === "browse-clear-filters" || target.startsWith("browse-recovery-"))) revealBelowHeader(element);
          else element?.scrollIntoView?.({ block: "start", behavior: "instant" });
        }
        if ((focusTarget || focusResults) && !focused) {
          focused = true;
          if (focusTarget) {
            if (groceryNotice) groceryNotice.scrollIntoView({ block: "start", behavior: "instant" });
            focusTarget.focus({ preventScroll: true });
          }
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
    const stop = (event: Event) => {
      cancelled = true;
      if (!document.querySelector("dialog[open]") && !(event instanceof KeyboardEvent && event.altKey)) forgetBrowseLowerTrigger();
    };
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
  }, [searchKey, mobileBrowseKey, groceryKey, invalidSearch, focusObsoleteBatch, invalidGroceryIdea, oldTailPrizes]);
  return null;
}
