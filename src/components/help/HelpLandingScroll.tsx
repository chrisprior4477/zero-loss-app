"use client";

import { useEffect } from "react";
import { readFaqReturn } from "@/lib/help/faq-return";

/** Respect deep links, and keep help destinations below the measured sticky header. */
export function HelpLandingScroll({ target, visitKey = target }: { target: string; visitKey?: string }) {
  useEffect(() => {
    let first = 0;
    let second = 0;
    let disposed = false;
    let interrupted = false;
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
          const [anchor] = anchors;
          const id = anchor || target;
          if (anchors.length > 1 && !anchors.every(value => value === anchor)) return;
          const element = document.getElementById(id);
          if (!element) return;
          if (anchors.length > 1) window.history.replaceState(window.history.state, "", `#${id}`);
          window.scrollTo({ top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - headerBottom - 12), behavior: "instant" });
        });
      });
    };
    // Font metrics can rewrap the heading/navigation after hydration. Measure only
    // after that layout settles so a deep-linked ticket isn't hidden by the header.
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
  }, [target, visitKey]);
  return null;
}
