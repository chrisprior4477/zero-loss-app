"use client";

import { useEffect } from "react";

/** Ordinary mobile wallet visits start at the balance card, below any of the six headers. */
export function WalletLandingScroll({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    let firstFrame = 0;
    let secondFrame = 0;
    const cancelFrames = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
    const revealBalance = () => {
      cancelFrames();
      const shouldReveal = () => window.matchMedia?.("(max-width: 767px)").matches
        && (!window.location.hash || window.location.hash === "#balance");
      if (!shouldReveal()) return;

      // Wait for the destination and Next's navigation scroll before measuring the header.
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (!shouldReveal()) return;
          const balance = document.getElementById("balance");
          if (!balance) return;
          const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
          const top = window.scrollY + balance.getBoundingClientRect().top - headerBottom - 12;
          window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        });
      });
    };
    revealBalance();
    window.addEventListener("hashchange", revealBalance);
    return () => {
      window.removeEventListener("hashchange", revealBalance);
      cancelFrames();
    };
  }, [enabled]);

  return null;
}
