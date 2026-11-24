"use client";

import { useEffect } from "react";
import { revealBelowHeader } from "@/lib/account/landing-position";

const pages = /^\/(?:faq|contact|support|account\/(?:entries(?:\/ent_[a-f0-9]{32})?|security|profile|wallet|orders|favorites|crew(?:\/display)?|notifications))$/;
const retailerRewards = /^\/rewards\/[a-z0-9-]+$/;
const stateKey = "zeroLossAccountHistoryReturn";
const returnLinks = "main a[href], footer a[data-footer-return], a[data-history-return]";
type ReturnBookmark = { source: string; href: string; index: number; top?: number; left?: number; footer?: boolean };
let pendingReturn: { bookmark: ReturnBookmark; expires: number } | null = null;

function currentReturn(): ReturnBookmark | undefined {
  const stored = history.state?.[stateKey];
  if (stored?.source === location.href) return stored;
  if (pendingReturn?.bookmark.source === location.href && pendingReturn.expires > Date.now()) return pendingReturn.bookmark;
}

export function hasAccountHistoryReturn() {
  return Boolean(currentReturn());
}

export function hasFooterHistoryReturn() {
  return currentReturn()?.footer === true;
}

export function rememberAccountHistoryReturn(anchor: HTMLAnchorElement, rail?: HTMLElement) {
  const href = anchor.getAttribute("href");
  const identical = [...document.querySelectorAll(returnLinks)].filter(link => link.getAttribute("href") === href);
  const footer = anchor.hasAttribute("data-footer-return");
  history.replaceState({ ...history.state, [stateKey]: {
    source: location.href, href, index: identical.indexOf(anchor),
    ...(rail ? { left: rail.scrollLeft } : {}),
    ...(footer ? { footer: true } : {}),
    ...(rail || footer || (anchor.hasAttribute("data-deposit-credit") || anchor.hasAttribute("data-history-return") && anchor.getAttribute("data-history-return") !== "focus") ? { top: scrollY } : {}),
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
      if (anchor.hasAttribute("data-footer-return")) { rememberAccountHistoryReturn(anchor); return; }
      if ((retailerRewards.test(location.pathname) || location.pathname === "/browse" && anchor.id === "request-a-product") && anchor.hasAttribute("data-history-return")) {
        rememberAccountHistoryReturn(anchor);
        return;
      }
      if (!accountLinks || !pages.test(location.pathname)) return;
      if (!/^(?:←\s*)?(?:Back to Account & Security|Edit profile|Continue shopping|View fulfillment status|Add funds)/i.test(anchor.textContent?.trim() ?? "")
        && !/^(?:Ask Support about my email|Account updates|Add to Crew|Manage Crew|Contact us|Open Wallet)/i.test(anchor.textContent?.trim() ?? "")
        && !anchor.hasAttribute("data-history-return") && !anchor.href.includes("/support?case=") && !anchor.hasAttribute("data-wallet-deposit") && !anchor.hasAttribute("data-deposit-credit")) return;
      rememberAccountHistoryReturn(anchor);
    }
    function interrupt() { stop(); pendingReturn = null; }
    function restore(event?: Event) {
      stop();
      if (event?.type === "popstate") {
        const returned = (event as PopStateEvent).state?.[stateKey] as ReturnBookmark | undefined;
        // Streaming the selected share can replace Next's history state during a Back visit.
        pendingReturn = returned?.source === location.href ? { bookmark: returned, expires: Date.now() + 6000 } : null;
      }
      const saved = currentReturn();
      if (!saved || saved.source !== location.href || typeof saved.href !== "string") return;
      const align = () => {
        if (saved.source !== location.href) return;
        const links = [...document.querySelectorAll<HTMLAnchorElement>(returnLinks)].filter(link => link.getAttribute("href") === saved.href);
        const visible = (link: HTMLAnchorElement | undefined) => Boolean(link?.getClientRects().length && !link.closest("[inert]"));
        const exact = links[saved.index];
        const link = visible(exact) ? exact : links.find(link => link.hasAttribute("data-history-return") && visible(link));
        if (!link) return;
        const rail = link.closest<HTMLElement>("[data-reward-history-rail]");
        if (rail && typeof saved.left === "number" && Number.isFinite(saved.left)) {
          rail.scrollLeft = saved.left;
          const railBox = rail.getBoundingClientRect();
          const card = link.getBoundingClientRect();
          if (card.right <= railBox.left || card.left >= railBox.right) rail.scrollLeft += card.left - railBox.left;
        }
        if (typeof saved.top === "number" && Number.isFinite(saved.top)) window.scrollTo({ top: saved.top, behavior: "instant" });
        link.focus({ preventScroll: true });
        const box = link.getBoundingClientRect();
        const header = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
        if (box.top < header || box.bottom > innerHeight) revealBelowHeader(link);
      };
      const delays = location.pathname === "/account/favorites" ? [60, 250, 700, 1500, 2600, 4200] : [60, 250, 700, 1500];
      timers = delays.map(delay => window.setTimeout(align, delay));
    }
    document.addEventListener("click", remember, true);
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("pageshow", restore);
    window.addEventListener("pointerdown", interrupt);
    window.addEventListener("keydown", interrupt);
    window.addEventListener("wheel", interrupt);
    return () => {
      stop();
      document.removeEventListener("click", remember, true);
      window.removeEventListener("popstate", restore);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("keydown", interrupt);
      window.removeEventListener("wheel", interrupt);
    };
  }, [accountLinks]);
  return null;
}
