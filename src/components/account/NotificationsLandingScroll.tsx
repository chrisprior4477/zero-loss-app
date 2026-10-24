"use client";

import { useEffect } from "react";

/** Mobile menu visits begin at Notifications, not the account overview above it. */
export function NotificationsLandingScroll() {
  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    let disposed = false;
    const heading = document.getElementById("notifications-intro");
    const container = heading?.parentElement;
    const cancel = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
    const measure = () => {
      const bottom = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0);
      container?.style.setProperty("--notifications-header-height", `${bottom}px`);
      return bottom;
    };
    const reveal = () => {
      if (disposed) return;
      cancel();
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          const headerBottom = measure();
          // Do not override Alert settings or another explicit destination.
          if (!heading || !window.matchMedia?.("(max-width: 767px)").matches
            || (window.location.hash && window.location.hash !== "#notifications-intro")) return;
          window.scrollTo({
            top: Math.max(0, window.scrollY + heading.getBoundingClientRect().top - headerBottom - 12),
            behavior: "instant",
          });
        });
      });
    };
    // Wait for font metrics and the router's own scroll restoration to settle.
    if (document.fonts) void document.fonts.ready.then(reveal);
    else reveal();
    window.addEventListener("hashchange", reveal);
    window.addEventListener("resize", measure);
    return () => {
      disposed = true;
      cancel();
      window.removeEventListener("hashchange", reveal);
      window.removeEventListener("resize", measure);
      container?.style.removeProperty("--notifications-header-height");
    };
  }, []);
  return null;
}
