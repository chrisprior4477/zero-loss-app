"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { readLedgerReturn, readLedgerSupportReturn } from "@/lib/wallet/ledger-return";

function subscribeToHistory(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  window.addEventListener("pageshow", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("pageshow", callback);
  };
}

/** A Support return owns its scroll; ordinary wallet/notification arrivals still align normally. */
export function WalletHistoryLandingScroll({ walletId, selectedId, selectedRequested, enabled, target }: {
  walletId?: string; selectedId?: string; selectedRequested?: boolean; enabled: boolean; target: string;
}) {
  const returning = useSyncExternalStore(subscribeToHistory,
    () => Boolean(walletId && (readLedgerReturn(window.history.state, walletId, window.location.href, selectedId)
      || readLedgerSupportReturn(walletId, window.location.href, selectedId))),
    () => false);
  return <>
    <WalletLandingScroll enabled={enabled && !returning} />
    {selectedRequested && !returning && <AccountSettingsLandingScroll target={target} initialTarget={target} visitKey={target} settleAfterNavigation allScreens />}
  </>;
}

/** Ordinary mobile wallet visits start at the relevant section, below the fixed header. */
export function WalletLandingScroll({ enabled = true, target = "balance" }: { enabled?: boolean; target?: "balance" | "ready-rewards" }) {
  useEffect(() => {
    if (!enabled) return;

    let firstFrame = 0;
    let secondFrame = 0;
    const cancelFrames = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
    const shouldReveal = (hash = window.location.hash) => window.matchMedia?.("(max-width: 767px)").matches
      && (!hash || hash === `#${target}`);
    const revealSection = () => {
      cancelFrames();
      if (!shouldReveal()) return;

      // Wait for the destination and Next's navigation scroll before measuring the header.
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (!shouldReveal()) return;
          const section = document.getElementById(target);
          if (!section) return;
          const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
          const top = window.scrollY + section.getBoundingClientRect().top - headerBottom - 12;
          window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        });
      });
    };
    // Next may keep the page mounted when its account-menu link is selected again.
    const onAnchor = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target && anchor.target !== "_self") return;
      const destination = new URL(anchor.href);
      if (destination.origin !== window.location.origin || destination.pathname !== window.location.pathname || destination.search !== window.location.search || !shouldReveal(destination.hash)) return;
      event.preventDefault();
      // Only the hash changes: preserve Back navigation without a competing router scroll.
      if (destination.href !== window.location.href) window.history.pushState(null, "", destination.href);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      revealSection();
    };
    const onHash = () => revealSection();
    revealSection();
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onAnchor, true);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onAnchor, true);
      cancelFrames();
    };
  }, [enabled, target]);

  return null;
}
