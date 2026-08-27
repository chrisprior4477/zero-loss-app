"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceSearchButton } from "@/components/home/VoiceSearchButton";

/**
 * Hero action row from the Checkpoint 2 artboards: Shop button, live winners
 * counter, and search field.
 *
 * Focus behaviour is transcribed from the design's own `shopWinnersStyle` /
 * `searchBoxStyle`: while the search field has focus, the Shop button and
 * winners chip are hidden and the field expands to cover the full row
 * (absolutely positioned over it, with a drop shadow). Blur restores the row.
 * On a phone this means the field takes the entire width instead of being
 * squeezed into a third of it.
 *
 * The rotating placeholder ("Search everyday" → "Search groceries" → "Search
 * ending soon") is the design's, and it stops entirely under
 * prefers-reduced-motion and while the field is focused or has a value.
 *
 * WINNER COUNT: `winnerCount` defaults to null, which renders a neutral dash
 * rather than a number. The artboard drives this from a timer and says so in
 * its own source ("Simulated live winner count — a real backend feed would
 * replace this timer with the actual tally"). A invented tally is the same
 * class of thing C3 removed from the activity feed, and spec §10 prohibits
 * fabricated activity outright, so nothing is invented here. Pass a real
 * figure once a feed exists.
 */

const SEARCH_WORDS = ["everyday", "groceries", "ending soon"] as const;
const ROTATE_MS = 2200;

type HeroSearchRowProps = {
  winnerCount?: number | null;
};

function formatWinners(n: number): string {
  if (n < 10_000) return n.toLocaleString();
  if (n < 1_000_000) return `${Math.floor(n / 1000)}K+`;
  return `${(n / 1_000_000).toFixed(1)}M+`;
}

function SearchIcon() {
  return (
    <span aria-hidden="true" className="relative block h-4 w-4 shrink-0">
      <span className="absolute left-0 top-0 box-border block h-2.5 w-2.5 rounded-full border-2 border-[var(--urgent)]" />
      <span className="absolute left-[9px] top-[9px] block h-0.5 w-[7px] origin-left rotate-45 rounded-sm bg-[var(--urgent)]" />
    </span>
  );
}

export function HeroSearchRow({ winnerCount = null }: HeroSearchRowProps) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused || query) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(
      () => setWordIndex((i) => (i + 1) % SEARCH_WORDS.length),
      ROTATE_MS
    );
    return () => window.clearInterval(id);
  }, [focused, query]);

  return (
    <div className="relative mb-5 flex h-11 items-center gap-3">
      {/* Hidden rather than unmounted so focus never lands on a removed node. */}
      <div className={`items-center gap-3 ${focused ? "hidden" : "flex"}`}>
        <button
          type="button"
          onClick={() => router.push("/browse")}
          className="h-11 shrink-0 bg-[var(--accent)] px-4 text-[13px] font-bold text-[var(--ink)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] motion-reduce:transform-none"
        >
          Shop
        </button>

        <div className="flex h-11 shrink-0 items-center gap-2 rounded-[10px] border border-[var(--border-strong)] border-l-[3px] border-l-[var(--live)] bg-[var(--surface)] py-2.5 pl-2.5 pr-3">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rotate-45 bg-[var(--accent)]"
          />
          <span>
            <span className="block text-[15px] font-extrabold leading-none tracking-[-0.02em] text-[var(--foreground)]">
              {winnerCount == null ? "—" : formatWinners(winnerCount)}
            </span>
            <span className="mt-0.5 block font-mono text-[8.5px] font-semibold uppercase leading-[1.3] tracking-[0.06em] text-[var(--live)]">
              Live Winners
            </span>
          </span>
        </div>
      </div>

      <div
        className={
          focused
            ? "absolute inset-0 z-20 flex items-center gap-1.5 rounded-[10px] bg-white px-2 shadow-[0_6px_22px_rgba(0,0,0,0.35)]"
            : "flex h-11 min-w-[70px] flex-1 items-center gap-1.5 rounded-[10px] border border-[var(--border-strong)] bg-white px-2"
        }
      >
        <SearchIcon />
        <label className="sr-only" htmlFor="hero-search">
          Search the marketplace
        </label>
        <input
          id="hero-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-describedby="hero-search-status"
          placeholder={`Search ${SEARCH_WORDS[wordIndex]}`}
          className="min-w-0 flex-1 truncate border-none bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[rgba(0,48,95,0.55)]"
        />
        <VoiceSearchButton onTranscript={setQuery} />
      </div>
      <p
        id="hero-search-status"
        className="absolute right-0 top-full mt-1 font-mono text-[9px] text-[var(--muted)]"
      >
        Search preview · results coming soon
      </p>
    </div>
  );
}
