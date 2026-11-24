"use client";

import { useEffect } from "react";
import { revealBelowHeader } from "@/lib/account/landing-position";

const pages = /^\/(?:faq|contact|support|account\/(?:entries(?:\/ent_[a-f0-9]{32})?|security|profile|wallet|orders|crew(?:\/display)?|notifications))$/;
const stateKey = "zeroLossAccountHistoryReturn";
const returnLinks = "main a[href], footer a[data-footer-policy]";

export function hasAccountHistoryReturn() {
  return history.state?.[stateKey]?.source === location.href;
}

export function hasFooterPolicyReturn() {
  return hasAccountHistoryReturn() && history.state[stateKey].footer === true;
}

export function rememberAccountHistoryReturn(anchor: HTMLAnchorElement, rail?: HTMLElement) {
  const href = anchor.getAttribute("href");
  const identical = [...document.querySelectorAll(returnLinks)].filter(link => link.getAttribute("href") === href);
  const footer = anchor.hasAttribute("data-footer-policy");
  history.replaceState({ ...history.state, [stateKey]: {
    source: location.href, href, index: identical.indexOf(anchor),
    ...(rail ? { left: rail.scrollLeft } : {}),
    ...(footer ? { footer: true } : {}),
    ...(rail || footer || (anchor.hasAttribute("data-deposit-credit") || anchor.hasAttribute("data-history-return")) ? { top: scrollY } : {}),
  } }, "");
}

export function AccountHistoryReturn({ accountLinks = true }: { accountLinks?: boolean }) {
  useEffect(() => {
    let timers: number[] = [];
    const stop = () => { timers.forEach(clearTimeout); timers = []; };
    function remember(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(returnLinks) : null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== location.origin || anchor.pathname + anchor.search === location.pathname + location.search) return;
      if (anchor.hasAttribute("data-footer-policy")) { rememberAccountHistoryReturn(anchor); return; }
      if (!accountLinks || !pages.test(location.pathname)) return;
      if (!/^(?:←\s*)?(?:Back to Account & Security|Edit profile|Continue shopping|View fulfillment status|Add funds)/i.test(anchor.textContent?.trim() ?? "")
        && !/^(?:Ask Support about my email|Account updates|Add to Crew|Manage Crew|Contact us|Open Wallet)/i.test(anchor.textContent?.trim() ?? "")
        && !anchor.hasAttribute("data-history-return") && !anchor.href.includes("/support?case=") && !anchor.hasAttribute("data-wallet-deposit") && !anchor.hasAttribute("data-deposit-credit")) return;
      rememberAccountHistoryReturn(anchor);
    }
    function restore() {
      stop();
      const saved = history.state?.[stateKey];
      if (!saved || saved.source !== location.href || typeof saved.href !== "string") return;
      const align = () => {
        if (saved.source !== location.href) return;
        const links = [...document.querySelectorAll<HTMLAnchorElement>(returnLinks)].filter(link => link.getAttribute("href") === saved.href);
        const link = links[saved.index] ?? links[0];
        if (!link?.getClientRects().length || link.closest("[inert]")) return;
        const rail = link.closest<HTMLElement>("[data-reward-history-rail]");
        if (rail && Number.isFinite(saved.left)) {
          rail.scrollLeft = saved.left;
          const railBox = rail.getBoundingClientRect();
          const card = link.getBoundingClientRect();
          if (card.right <= railBox.left || card.left >= railBox.right) rail.scrollLeft += card.left - railBox.left;
        }
        if (Number.isFinite(saved.top)) window.scrollTo({ top: saved.top, behavior: "instant" });
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
  }, [accountLinks]);
  return null;
}
