"use client";

import { useLayoutEffect } from "react";

/** Funding and sign-in keep their existing entry anchor, but the compact card fits as a whole. */
export function ProductEntryAutoScroll({ productKey }: { productKey: string }) {
  useLayoutEffect(() => {
    let cancelled = false;
    const source = new URLSearchParams(window.location.search).get("from");
    const fromCrew = source?.startsWith("/account/crew");
    const needsSettling = !fromCrew || ["#enter-entry", "#entry-action"].includes(window.location.hash);
    let first = 0, second = 0;
    let settle: ReturnType<typeof setTimeout>;
    let focused = false;
    const align = () => {
      cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle);
      const scroll = () => {
        if (cancelled) return;
        let hash = window.location.hash;
        if (/^#entry-action(?:#(?:entry-action|enter-entry))+$/.test(hash)) {
          hash = "#entry-action";
          window.history.replaceState(window.history.state, "", hash);
        }
        if (hash && !["#enter-entry", "#product-entry-card", "#entry-action"].includes(hash)) return;
        const action = hash === "#entry-action" ? document.getElementById("entry-action") : null;
        if (action) {
          const header = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0);
          window.scrollTo({ top: Math.max(0, window.scrollY + action.getBoundingClientRect().top - header - 12), behavior: "instant" });
          if (!focused || document.activeElement === document.body || document.activeElement?.id === "main-content") {
            action.focus({ preventScroll: true });
            focused = true;
          }
        } else {
          document.getElementById("product-entry-card")?.scrollIntoView?.({ block: "start", behavior: "instant" });
          if (!focused && hash === "#enter-entry" && source?.startsWith("/rewards/")) {
            const entry = document.getElementById("enter-entry");
            entry?.focus({ preventScroll: true });
            focused = Boolean(entry);
          }
        }
      };
      scroll();
      if (!needsSettling) return;
      first = requestAnimationFrame(() => { second = requestAnimationFrame(scroll); });
      settle = setTimeout(scroll, 280);
    };
    align();
    const header = document.querySelector("header");
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(align);
    if (header && needsSettling) observer?.observe(header);
    const stopObserving = setTimeout(() => observer?.disconnect(), 1500);
    const navigate = () => { cancelled = false; focused = false; align(); };
    const stop = () => { cancelled = true; observer?.disconnect(); };
    window.addEventListener("hashchange", navigate);
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      cancelled = true; cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle); clearTimeout(stopObserving); observer?.disconnect();
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("pointerdown", stop); window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", stop);
    };
  }, [productKey]);
  return null;
}
