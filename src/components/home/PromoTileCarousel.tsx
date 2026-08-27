"use client";

import { useRef } from "react";
import Link from "next/link";
import { placeholderPromoTiles } from "@/lib/home/placeholder-data";

/**
 * Promo tile rail from the Checkpoint 2 artboards.
 *
 * Per C7 this is drag- and arrow-driven with auto-scroll OFF by default —
 * nothing advances on a timer, so there is no motion to interrupt and no
 * behaviour that fights a user mid-scroll. Native horizontal scrolling does
 * the work; the arrows are a keyboard- and mouse-reachable equivalent, and
 * scroll-behavior is smooth only when the user has not asked for reduced
 * motion.
 */

const TILE_STRIDE = 314; /* 300px tile + 14px gap, matching the artboard */

export function PromoTileCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByTiles = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    track.scrollBy({
      left: direction * TILE_STRIDE,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <section aria-label="Promotions" className="relative">
      <div
        ref={trackRef}
        className="zl-noscroll flex gap-3.5 overflow-x-auto"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollByTiles(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollByTiles(1);
          }
        }}
      >
        {placeholderPromoTiles.map((tile) => (
          <Link
            key={tile.id}
            href={tile.href}
            className="grid h-28 w-[300px] shrink-0 grid-cols-[40%_60%] overflow-hidden rounded-[18px] bg-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] motion-reduce:transform-none"
          >
            <span
              aria-hidden="true"
              className="h-full w-full bg-[linear-gradient(150deg,var(--accent-deep),var(--accent))]"
            />
            <span className="flex items-center bg-[#f7f7f5] px-3.5 py-3 text-left text-[19px] font-black leading-[0.98] text-[var(--ink)]">
              {tile.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByTiles(-1)}
          aria-label="Scroll promotions left"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => scrollByTiles(1)}
          aria-label="Scroll promotions right"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
        >
          ›
        </button>
      </div>
    </section>
  );
}
