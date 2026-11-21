"use client";

import { useEffect } from "react";
import { readFaqReturn } from "@/lib/help/faq-return";

/** Respect deep links, and keep help destinations below the measured sticky header. */
export function HelpLandingScroll({ target, visitKey = target, landingAlias, focusReport = false, focusAnchor, focusAnchorPrefix, missingAnchorTarget, focusOnArrival = false }: { target: string; visitKey?: string; landingAlias?: string; focusReport?: boolean; focusAnchor?: string | readonly string[]; focusAnchorPrefix?: string; missingAnchorTarget?: string; focusOnArrival?: boolean }) {
  useEffect(() => {
    let first = 0;
    let second = 0;
    let disposed = false;
    let interrupted = false;
    const matchesFocusAnchor = (id: string) => typeof focusAnchor === "string" ? id === focusAnchor : focusAnchor?.includes(id);
    const cancel = () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
    const stop = () => { interrupted = true; cancel(); };
    const measure = () => {
      const bottom = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0);
      document.documentElement.style.setProperty("--help-header-height", `${bottom}px`);
      return bottom;
    };
    const reveal = () => {
      if (disposed || interrupted) return;
      cancel();
      first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          if (disposed || interrupted) return;
          const headerBottom = measure();
          if (target === "faq-intro" && readFaqReturn(window.history.state, window.location.href)) return;
          const anchors = window.location.hash.slice(1).split("#");
          const anchor = anchors.at(-1) ?? "";
          const id = anchor && anchor !== landingAlias && !focusOnArrival ? anchor : target;
          if (anchors.length > 1 && !anchors.every(value => value === anchor || matchesFocusAnchor(value))) return;
          const prefixed = Boolean(focusAnchorPrefix && id.startsWith(focusAnchorPrefix));
          if (focusAnchorPrefix && !prefixed && !matchesFocusAnchor(id)) return;
          const destinationId = prefixed && missingAnchorTarget && !document.getElementById(id) ? missingAnchorTarget : id;
          const element = document.getElementById(destinationId);
          if (!element) return;
          if (anchors.length > 1 || destinationId !== id) window.history.replaceState(window.history.state, "", `#${destinationId}`);
          if (prefixed && element instanceof HTMLDetailsElement) element.open = true;
          window.scrollTo({ top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - headerBottom - 12), behavior: "instant" });
          if (focusOnArrival || (focusReport && id === "report-problem") || (anchor && matchesFocusAnchor(id)) || prefixed) {
            (element.querySelector<HTMLElement>("summary, h2[tabindex]") ?? element).focus({ preventScroll: true });
          }
        });
      });
    };
    // Font metrics can rewrap the heading/navigation after hydration. Measure only
    // after that layout settles so a deep-linked ticket isn't hidden by the header.
    const arrivalAnchor = window.location.hash.split("#").at(-1) ?? "";
    if (matchesFocusAnchor(arrivalAnchor) || focusAnchorPrefix && arrivalAnchor.startsWith(focusAnchorPrefix)) reveal();
    if (document.fonts) void document.fonts.ready.then(reveal);
    else reveal();
    const navigate = () => { interrupted = false; reveal(); };
    window.addEventListener("hashchange", navigate);
    window.addEventListener("resize", measure);
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      disposed = true; cancel();
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      document.documentElement.style.removeProperty("--help-header-height");
    };
  }, [target, visitKey, landingAlias, focusReport, focusAnchor, focusAnchorPrefix, missingAnchorTarget, focusOnArrival]);
  return null;
}
