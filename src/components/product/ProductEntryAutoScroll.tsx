"use client";

import { useEffect } from "react";

/** Funding and sign-in keep their existing entry anchor, but the compact card fits as a whole. */
export function ProductEntryAutoScroll({ productKey }: { productKey: string }) {
  useEffect(() => {
    let cancelled = false;
    let first = 0, second = 0;
    let settle: ReturnType<typeof setTimeout>;
    const align = () => {
      const hash = window.location.hash;
      if (hash && hash !== "#enter-entry" && hash !== "#product-entry-card") return;
      cancelAnimationFrame(first); cancelAnimationFrame(second); clearTimeout(settle);
      const scroll = () => { if (!cancelled) document.getElementById("product-entry-card")?.scrollIntoView?.({ block: "start", behavior: "auto" }); };
      first = requestAnimationFrame(() => { second = requestAnimationFrame(scroll); });
      settle = setTimeout(scroll, 280);
    };
    align();
    const header = document.querySelector("header");
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(align);
    if (header) observer?.observe(header);
    const stopObserving = setTimeout(() => observer?.disconnect(), 1500);
    const navigate = () => { cancelled = false; align(); };
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
