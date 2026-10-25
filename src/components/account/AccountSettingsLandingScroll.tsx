"use client";

import { useEffect } from "react";

/** Destination-owned mobile landing, regardless of which link opened settings. */
export function AccountSettingsLandingScroll({ target, visitKey = target, settleAfterNavigation = false }: { target: string; visitKey?: string; settleAfterNavigation?: boolean }) {
  useEffect(() => {
    let first = 0;
    let second = 0;
    let disposed = false;
    let interrupted = false;
    let settlingUntil = 0;
    let requestedId = "";
    const settlingTimers: number[] = [];
    const header = document.querySelector<HTMLElement>("header.sticky");
    const scope = document.getElementById(target)?.closest("main");
    const cancel = () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
    const measure = () => {
      const bottom = Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
      scope?.style.setProperty("--settings-header-bottom", `${bottom}px`);
      return bottom;
    };
    const align = () => {
      if (disposed || interrupted || !window.matchMedia?.("(max-width: 767px)").matches) return;
      cancel();
      first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          if (disposed || interrupted) return;
          // Older profile shortcuts should retain the four section buttons too.
          const id = requestedId === "profile-intro" ? "account-settings-sections" : requestedId;
          const destination = (id && document.getElementById(id)) || document.getElementById(target);
          if (!destination) return;
          const delta = destination.getBoundingClientRect().top - measure() - 12;
          if (Math.abs(delta) > 1) window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: "instant" });
        });
      });
    };
    const reveal = (id = window.location.hash.slice(1)) => {
      if (disposed) return;
      requestedId = id;
      interrupted = false;
      settlingUntil = Date.now() + (settleAfterNavigation ? 1500 : 1000);
      align();
    };
    const interrupt = () => { interrupted = true; cancel(); };
    const onHash = () => reveal();
    const onAnchor = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      const url = new URL(anchor.href);
      if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search) reveal(url.hash.slice(1));
    };
    const onResize = () => { measure(); };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      measure();
      // The mobile header can collapse after the initial scroll. Correct once
      // it settles, but never pull the user back after they start interacting.
      if (Date.now() < settlingUntil) align();
    });
    if (header) observer?.observe(header);
    measure();
    const onScroll = () => { if (settleAfterNavigation && Date.now() < settlingUntil) align(); };
    const ready = () => {
      if (disposed || interrupted) return;
      reveal();
      // Router/browser restoration can run after hydration and font readiness.
      // Settle this visit briefly, and stop immediately on any user interaction.
      if (settleAfterNavigation) for (const delay of [150, 400, 900]) settlingTimers.push(window.setTimeout(align, delay));
    };
    if (document.fonts) void document.fonts.ready.then(ready);
    else ready();
    window.addEventListener("hashchange", onHash);
    window.addEventListener("resize", onResize);
    if (settleAfterNavigation) window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("keydown", interrupt);
    document.addEventListener("click", onAnchor, true);
    return () => {
      disposed = true; cancel(); observer?.disconnect();
      settlingTimers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("keydown", interrupt);
      document.removeEventListener("click", onAnchor, true);
      scope?.style.removeProperty("--settings-header-bottom");
    };
  }, [target, visitKey, settleAfterNavigation]);
  return null;
}
