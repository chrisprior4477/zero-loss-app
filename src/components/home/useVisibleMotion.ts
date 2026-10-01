"use client";

import { useEffect, useState, type RefObject } from "react";

/** Keep decorative motion idle when it cannot be seen or motion is reduced. */
export function useVisibleMotion(elementRef: RefObject<HTMLElement | null>) {
  const [canAnimate, setCanAnimate] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let inView = typeof IntersectionObserver === "undefined";
    const update = () => setCanAnimate(inView && document.visibilityState === "visible" && !motionPreference?.matches);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    }, { rootMargin: "64px" });

    observer?.observe(element);
    update();
    document.addEventListener("visibilitychange", update);
    motionPreference?.addEventListener("change", update);

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
      motionPreference?.removeEventListener("change", update);
    };
  }, [elementRef]);

  return canAnimate;
}
