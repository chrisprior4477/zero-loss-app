"use client";

import { useEffect } from "react";

/** Respect deep links, and keep help destinations below the measured sticky header. */
export function HelpLandingScroll({ target, visitKey = target }: { target: string; visitKey?: string }) {
  useEffect(() => {
    let first = 0;
    let second = 0;
    let disposed = false;
    const cancel = () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
    const measure = () => {
      const bottom = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0);
      document.documentElement.style.setProperty("--help-header-height", `${bottom}px`);
      return bottom;
    };
    const reveal = () => {
      if (disposed) return;
      cancel();
      first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          const headerBottom = measure();
          const id = window.location.hash.slice(1) || target;
          const element = document.getElementById(id);
          if (!element) return;
          window.scrollTo({ top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - headerBottom - 12), behavior: "instant" });
        });
      });
    };
    // Font metrics can rewrap the heading/navigation after hydration. Measure only
    // after that layout settles so a deep-linked ticket isn't hidden by the header.
    if (document.fonts) void document.fonts.ready.then(reveal);
    else reveal();
    window.addEventListener("hashchange", reveal);
    window.addEventListener("resize", measure);
    return () => { disposed = true; cancel(); window.removeEventListener("hashchange", reveal); window.removeEventListener("resize", measure); document.documentElement.style.removeProperty("--help-header-height"); };
  }, [target, visitKey]);
  return null;
}
