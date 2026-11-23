"use client";

import { useEffect } from "react";
import { revealBelowHeader } from "@/lib/account/landing-position";

const pages = /^\/(?:faq|contact|support|account\/(?:entries(?:\/ent_[a-f0-9]{32})?|security|profile|wallet|orders|crew))$/;
const stateKey = "zeroLossAccountHistoryReturn";

export function hasAccountHistoryReturn() {
  return history.state?.[stateKey]?.source === location.href;
}

export function rememberAccountHistoryReturn(anchor: HTMLAnchorElement, rail?: HTMLElement) {
  const href = anchor.getAttribute("href");
  const identical = [...document.querySelectorAll("main a[href]")].filter(link => link.getAttribute("href") === href);
  history.replaceState({ ...history.state, [stateKey]: {
    source: location.href, href, index: identical.indexOf(anchor),
    ...(rail ? { left: rail.scrollLeft, top: scrollY } : {}),
  } }, "");
}

export function AccountHistoryReturn() {
  useEffect(() => {
    let timers: number[] = [];
    const stop = () => { timers.forEach(clearTimeout); timers = []; };
    function remember(event: MouseEvent) {
      if (!pages.test(location.pathname) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("main a[href]") : null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== location.origin || anchor.pathname + anchor.search === location.pathname + location.search) return;
      if (!/^(?:←\s*)?(?:Back to Account & Security|Edit profile|Continue shopping|View fulfillment status|Add funds)/i.test(anchor.textContent?.trim() ?? "")
        && !/^(?:Ask Support about my email|Account updates|Add to Crew|Manage Crew|Contact us|Open Wallet)/i.test(anchor.textContent?.trim() ?? "")
        && !anchor.href.includes("/support?case=") && !anchor.hasAttribute("data-wallet-deposit")) return;
      rememberAccountHistoryReturn(anchor);
    }
    function restore() {
      stop();
      const saved = history.state?.[stateKey];
      if (!saved || saved.source !== location.href || typeof saved.href !== "string") return;
      const align = () => {
        if (saved.source !== location.href) return;
        const links = [...document.querySelectorAll<HTMLAnchorElement>("main a[href]")].filter(link => link.getAttribute("href") === saved.href);
        const link = links[saved.index] ?? links[0];
        if (!link?.getClientRects().length || link.closest("[inert]")) return;
        const rail = link.closest<HTMLElement>("[data-reward-history-rail]");
        if (rail && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
          rail.scrollLeft = saved.left;
          const railBox = rail.getBoundingClientRect();
          const card = link.getBoundingClientRect();
          if (card.right <= railBox.left || card.left >= railBox.right) rail.scrollLeft += card.left - railBox.left;
          window.scrollTo({ top: saved.top, behavior: "instant" });
        }
        link.focus({ preventScroll: true });
        const box = link.getBoundingClientRect();
        const header = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
        if (box.top < header || box.bottom > innerHeight) revealBelowHeader(link);
      };
      timers = [60, 250, 700, 1500].map(delay => window.setTimeout(align, delay));
    }
    document.addEventListener("click", remember, true);
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("pageshow", restore);
    window.addEventListener("pointerdown", stop);
    window.addEventListener("keydown", stop);
    window.addEventListener("wheel", stop);
    return () => {
      stop();
      document.removeEventListener("click", remember, true);
      window.removeEventListener("popstate", restore);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("wheel", stop);
    };
  }, []);
  return null;
}
