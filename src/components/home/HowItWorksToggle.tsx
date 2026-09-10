"use client";

import { useId, useState } from "react";
import { ZeroLossJourney } from "@/components/home/ZeroLossJourney";

/**
 * The hero's HOW IT WORKS control, from the Checkpoint 2 artboards.
 *
 * This is an in-place disclosure (`toggleHowItWorks` in the design), NOT a
 * link. An earlier version of the hero wired it to /how-it-works, which
 * navigated away to the placeholder route instead of revealing the panel.
 * The primary nav already carries a How It Works link for people who want
 * the full page; this control exists to answer the question without leaving
 * the homepage.
 *
 * The panel copy follows the current completion rules: an everyday/on-demand
 * non-selected entry remains attached to its exact product (§3.1). The
 * proposed same-retailer gift-card fallback for a genuinely scarce item is
 * unresolved and inactive (§3.2), so it is not presented as available.
 *
 * Black text on the orange panel, per C4.
 */
export function HowItWorksToggle() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded border border-[rgba(255,255,255,0.5)] px-4 text-xs font-bold tracking-[0.03em] text-[var(--foreground)] transition-colors hover:bg-[rgba(255,255,255,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        HOW IT WORKS
        <span aria-hidden="true" className="text-sm text-[var(--accent-light)]">
          {open ? "↑" : "↓"}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-[#00132e] px-4 py-5"
        >
          <p className="text-sm leading-[1.5] text-white/80">
            If your everyday-item entry is not selected, you can apply what you
            paid toward that exact product and pay the remaining balance.
          </p>
          <p className="mt-2.5 text-sm leading-[1.5] text-white/80">
            The same-retailer gift-card completion option for genuinely scarce
            items is still under review and is not currently available.
          </p>
          <div className="mt-5 border-t border-white/10 pt-5">
            <ZeroLossJourney compact />
          </div>
        </div>
      ) : null}
    </>
  );
}
