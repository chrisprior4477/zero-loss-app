"use client";

import { useEffect } from "react";
import { readNotificationReturn } from "@/lib/account/notification-return";

/** Mobile menu visits begin at Notifications, not the account overview above it. */
export function NotificationsLandingScroll({ userId }: { userId?: string }) {
  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    let disposed = false;
    let interrupted = false;
    const heading = document.getElementById("notifications-intro");
    const container = heading?.parentElement;
    const cancel = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
    const stop = () => { interrupted = true; cancel(); };
    const measure = () => {
      const bottom = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0);
      container?.style.setProperty("--notifications-header-height", `${bottom}px`);
      return bottom;
    };
    const reveal = () => {
      if (disposed || interrupted) return;
      cancel();
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (disposed || interrupted) return;
          const headerBottom = measure();
          // Do not override Alert settings or another explicit destination.
          if ((userId && readNotificationReturn(window.history.state, userId, window.location.href))
            || !heading || !window.matchMedia?.("(max-width: 767px)").matches
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
    const navigate = () => { interrupted = false; reveal(); };
    window.addEventListener("hashchange", navigate);
    window.addEventListener("resize", measure);
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      disposed = true;
      cancel();
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      container?.style.removeProperty("--notifications-header-height");
    };
  }, [userId]);
  return null;
}
